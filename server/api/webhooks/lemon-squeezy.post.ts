import { createHmac, timingSafeEqual } from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  // ─── 1. Read raw body (needed for HMAC verification) ───
  const rawBody = await readRawBody(event, 'utf8')

  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Empty request body' })
  }

  // ─── 2. Verify HMAC-SHA256 signature ───
  const config = useRuntimeConfig()
  const secret = config.lemonSqueezyWebhookSecret

  if (!secret) {
    console.error('[LS Webhook] lemonSqueezyWebhookSecret is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Webhook secret not configured' })
  }

  const signatureHeader = getHeader(event, 'x-signature')

  if (!signatureHeader) {
    console.warn('[LS Webhook] Missing x-signature header')
    throw createError({ statusCode: 401, statusMessage: 'Missing x-signature header' })
  }

  const hmac = createHmac('sha256', secret)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')

  const digestBuffer = Buffer.from(digest, 'utf8')
  const signatureBuffer = Buffer.from(signatureHeader, 'utf8')

  if (digestBuffer.length !== signatureBuffer.length || !timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.warn('[LS Webhook] Invalid signature')
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  // ─── 3. Parse payload ───
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' })
  }

  const eventName: string = payload.meta?.event_name || ''
  const customData = payload.meta?.custom_data || {}
  const userId: string = String(customData.user_id || '')
  const attributes = payload.data?.attributes || {}
  const lsOrderId: string = String(payload.data?.id || '')
  const lsCustomerId: string = String(attributes.customer_id || '')

  console.log(`[LS Webhook] Event: ${eventName}, userId: ${userId}, lsOrderId: ${lsOrderId}`)

  if (!userId) {
    console.error('[LS Webhook] Missing user_id in custom_data')
    // Return 200 so LS doesn't retry an uncorrectable payload
    return { received: true, warning: 'Missing user_id in custom_data' }
  }

  const db = useDb()

  // ─── 4. Handle events ───
  try {
    switch (eventName) {
      case 'order_created': {
        // One-time purchase: upgrade immediately
        const existingOrder = await db.execute({
          sql: 'SELECT id FROM orders WHERE lemon_squeezy_order_id = ? AND status = ?',
          args: [lsOrderId, 'APPROVED']
        })

        if (existingOrder.rows.length > 0) {
          console.log(`[LS Webhook] Order ${lsOrderId} already processed, skipping`)
          return { received: true, info: 'Already processed' }
        }

        await db.execute({
          sql: `UPDATE users
                SET subscription_name = 'pro',
                    subscription_source = 'lemon_squeezy',
                    last_payment_at = CURRENT_TIMESTAMP,
                    lemon_squeezy_customer_id = ?,
                    lemon_squeezy_order_id = ?
                WHERE id = ?`,
          args: [lsCustomerId, lsOrderId, userId]
        })

        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            lsOrderId,
            attributes.user_email || null,
            attributes.total || 0,
            attributes.currency || 'USD',
            'APPROVED',
            eventName,
            rawBody
          ]
        })

        console.log(`[LS Webhook] User ${userId} upgraded to pro (order: ${lsOrderId})`)
        break
      }

      case 'subscription_created': {
        await db.execute({
          sql: `UPDATE users
                SET subscription_name = 'pro',
                    subscription_source = 'lemon_squeezy',
                    last_payment_at = CURRENT_TIMESTAMP,
                    lemon_squeezy_customer_id = ?,
                    lemon_squeezy_order_id = ?
                WHERE id = ?`,
          args: [lsCustomerId, lsOrderId, userId]
        })

        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            lsOrderId,
            attributes.user_email || null,
            attributes.total || 0,
            attributes.currency || 'USD',
            'APPROVED',
            eventName,
            rawBody
          ]
        })

        console.log(`[LS Webhook] User ${userId} upgraded to pro (subscription: ${lsOrderId})`)
        break
      }

      case 'subscription_payment_recovered': {
        // Renew pro after a failed payment that was later recovered
        await db.execute({
          sql: `UPDATE users
                SET subscription_name = 'pro',
                    subscription_source = 'lemon_squeezy',
                    last_payment_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [userId]
        })

        console.log(`[LS Webhook] User ${userId} subscription recovered → pro`)
        break
      }

      case 'subscription_cancelled':
      case 'subscription_expired': {
        // Only downgrade if Lemon Squeezy is the active subscription source
        await db.execute({
          sql: `UPDATE users SET subscription_name = 'free_trial', subscription_source = NULL WHERE id = ? AND subscription_source = 'lemon_squeezy'`,
          args: [userId]
        })

        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            lsOrderId,
            attributes.user_email || null,
            0,
            attributes.currency || 'USD',
            eventName === 'subscription_cancelled' ? 'CANCELLED' : 'EXPIRED',
            eventName,
            rawBody
          ]
        })

        console.log(`[LS Webhook] User ${userId} downgraded to free_trial (${eventName})`)
        break
      }

      case 'subscription_payment_failed': {
        // Log only — do not downgrade yet, LS will retry and send subscription_expired if needed
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            lsOrderId,
            attributes.user_email || null,
            attributes.total || 0,
            attributes.currency || 'USD',
            'FAILED',
            eventName,
            rawBody
          ]
        })

        console.log(`[LS Webhook] Payment failed for user ${userId} (order: ${lsOrderId})`)
        break
      }

      case 'subscription_updated': {
        console.log(`[LS Webhook] subscription_updated for user ${userId} — no action taken`)
        break
      }

      default:
        console.log(`[LS Webhook] Unhandled event: ${eventName}`)
    }
  } catch (error: any) {
    console.error(`[LS Webhook] Error processing ${eventName}:`, error)
    // Return 200 to prevent LS from retrying an error we caused
    return { received: true, error: error.message }
  }

  return { received: true }
})
