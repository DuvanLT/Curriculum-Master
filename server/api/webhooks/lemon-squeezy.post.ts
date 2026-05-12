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
    console.error('[Webhook] LEMON_SQUEEZY_WEBHOOK_SECRET is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Webhook secret not configured' })
  }

  const signatureHeader = getHeader(event, 'x-signature')

  if (!signatureHeader) {
    throw createError({ statusCode: 401, statusMessage: 'Missing X-Signature header' })
  }

  const hmac = createHmac('sha256', secret)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')

  // Timing-safe comparison to prevent timing attacks
  const digestBuffer = Buffer.from(digest, 'utf8')
  const signatureBuffer = Buffer.from(signatureHeader, 'utf8')

  if (digestBuffer.length !== signatureBuffer.length || !timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.warn('[Webhook] Invalid signature received')
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  // ─── 3. Parse the verified payload ───
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' })
  }

  const eventName = payload?.meta?.event_name
  const customData = payload?.meta?.custom_data
  const userId = customData?.user_id
  const attributes = payload?.data?.attributes || {}
  const orderId = String(payload?.data?.id || '')

  console.log(`[Webhook] Received event: ${eventName} for user: ${userId}`)

  // ─── 4. Validate user_id from custom_data ───
  if (!userId) {
    console.error('[Webhook] No user_id in custom_data', { eventName, customData })
    // Return 200 anyway to prevent Lemon Squeezy from retrying
    // (could be a test webhook from the dashboard)
    return { received: true, warning: 'No user_id in custom_data' }
  }

  const db = useDb()

  // ─── 5. Handle events ───
  try {
    switch (eventName) {
      case 'order_created':
      case 'subscription_created': {
        // Upgrade user to pro
        await db.execute({
          sql: `UPDATE users 
                SET subscription_name = 'pro',
                    last_payment_at = CURRENT_TIMESTAMP,
                    lemon_squeezy_customer_id = ?,
                    lemon_squeezy_order_id = ?
                WHERE id = ?`,
          args: [
            String(attributes.customer_id || ''),
            orderId,
            userId
          ]
        })

        // Log the order for audit
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            orderId,
            attributes.user_email || null,
            attributes.total || 0,
            attributes.currency || 'USD',
            attributes.status || 'paid',
            eventName,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} upgraded to pro (order: ${orderId})`)
        break
      }

      case 'subscription_expired': {
        // Downgrade user back to free trial
        await db.execute({
          sql: `UPDATE users SET subscription_name = 'free_trial' WHERE id = ?`,
          args: [userId]
        })

        // Log the event
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            orderId,
            attributes.user_email || null,
            0,
            attributes.currency || 'USD',
            'expired',
            eventName,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} downgraded to free_trial (event: ${eventName})`)
        break
      }

      case 'subscription_cancelled': {
        // Just log the cancellation, don't revoke access yet
        // Access will be revoked when 'subscription_expired' is received at the end of the period
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            orderId,
            attributes.user_email || null,
            0,
            attributes.currency || 'USD',
            'cancelled',
            eventName,
            rawBody
          ]
        })
        console.log(`[Webhook] Subscription cancelled for user ${userId}. Access remains until expiration.`)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event: ${eventName}`)
    }
  } catch (error: any) {
    console.error(`[Webhook] Error processing event ${eventName}:`, error)
    // Still return 200 to prevent retries — log the error for debugging
    return { received: true, error: error.message }
  }

  // ─── 6. Return 200 OK (required by Lemon Squeezy) ───
  return { received: true }
})
