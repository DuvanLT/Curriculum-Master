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
  const secret = config.testBoldSecret || config.boldSecret

  if (!secret) {
    console.error('[Webhook] Bold webhook secret is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Webhook secret not configured' })
  }

  const signatureHeader = getHeader(event, 'x-bold-signature')

  if (!signatureHeader) {
    console.warn('[Webhook] Missing x-bold-signature header')
    throw createError({ statusCode: 401, statusMessage: 'Missing x-bold-signature header' })
  }

  const hmac = createHmac('sha256', secret)
  hmac.update(rawBody)
  const digest = hmac.digest('hex')

  const digestBuffer = Buffer.from(digest, 'utf8')
  const signatureBuffer = Buffer.from(signatureHeader, 'utf8')

  if (digestBuffer.length !== signatureBuffer.length || !timingSafeEqual(digestBuffer, signatureBuffer)) {
    console.warn('[Webhook] Invalid signature received')
    throw createError({ statusCode: 401, statusMessage: 'Invalid signature' })
  }

  // ─── 3. Parse payload ───
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON payload' })
  }

  const eventType = payload.type
  const transactionData = payload.data || {}
  const reference = transactionData.reference || payload.subject || ''
  const transactionId = String(transactionData.transaction_id || transactionData.id || payload.id || '')

  console.log(`[Webhook] Received Bold event: ${eventType}, reference: ${reference}, txn: ${transactionId}`)
  console.log(`[Webhook] Full payload:`, rawBody)

  // ─── 4. Extract user_id from reference (format: userId-timestamp) ───
  if (!reference) {
    console.error('[Webhook] Missing reference in payload')
    // Return 200 OK so Bold doesn't retry
    return { received: true, warning: 'Missing reference in payload' }
  }

  // The reference format is "userId-timestamp", extract just the userId part
  // userId itself may contain hyphens (UUID format), so we split by the last hyphen
  const lastDashIndex = reference.lastIndexOf('-')
  const userId = lastDashIndex > 0 ? reference.substring(0, lastDashIndex) : reference

  if (!userId) {
    console.error('[Webhook] Invalid reference format:', reference)
    return { received: true, warning: 'Invalid reference format' }
  }

  const db = useDb()

  // ─── 5. Handle events ───
  try {
    switch (eventType) {
      case 'SALE_APPROVED': {
        // Check idempotency: don't process the same transaction twice
        const existingOrder = await db.execute({
          sql: 'SELECT id FROM orders WHERE gateway_order_id = ? AND status = ?',
          args: [transactionId, 'APPROVED']
        })

        if (existingOrder.rows.length > 0) {
          console.log(`[Webhook] Transaction ${transactionId} already processed, skipping`)
          return { received: true, info: 'Already processed' }
        }

        // Upgrade user to pro
        await db.execute({
          sql: `UPDATE users 
                SET subscription_name = 'pro',
                    last_payment_at = CURRENT_TIMESTAMP,
                    gateway_customer_id = ?,
                    gateway_order_id = ?
                WHERE id = ?`,
          args: [
            transactionData.merchant_id || '',
            transactionId,
            userId
          ]
        })

        // Log the order for audit
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, gateway_order_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            transactionId,
            transactionId,
            transactionData.payer_email || null,
            transactionData.amount || 0,
            transactionData.currency || 'COP',
            'APPROVED',
            eventType,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} upgraded to pro (transaction: ${transactionId})`)
        break
      }

      case 'SALE_REJECTED': {
        // Log the rejected sale but don't change user status
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, gateway_order_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            transactionId,
            transactionId,
            transactionData.payer_email || null,
            transactionData.amount || 0,
            transactionData.currency || 'COP',
            'REJECTED',
            eventType,
            rawBody
          ]
        })

        console.log(`[Webhook] Payment rejected for user ${userId} (transaction: ${transactionId})`)
        break
      }

      case 'VOID_APPROVED': {
        // Downgrade user back to free trial (refund/cancel)
        await db.execute({
          sql: `UPDATE users SET subscription_name = 'free_trial' WHERE id = ?`,
          args: [userId]
        })

        await db.execute({
          sql: `INSERT INTO orders (id, user_id, gateway_order_id, lemon_squeezy_order_id, customer_email, total, currency, status, event_name, payload_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            transactionId,
            transactionId,
            transactionData.payer_email || null,
            0,
            transactionData.currency || 'COP',
            'REFUNDED',
            eventType,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} downgraded to free_trial (void/refund, txn: ${transactionId})`)
        break
      }

      case 'VOID_REJECTED': {
        console.log(`[Webhook] Void rejected for user ${userId} (txn: ${transactionId}). No action taken.`)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (error: any) {
    console.error(`[Webhook] Error processing event ${eventType}:`, error)
    // Still return 200 to prevent Bold from retrying
    return { received: true, error: error.message }
  }

  // Always return 200 OK so Bold doesn't retry
  return { received: true }
})
