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
  const reference = transactionData.reference || ''
  const transactionId = String(transactionData.transaction_id || transactionData.id || '')

  console.log(`[Webhook] Received Bold event: ${eventType} for reference: ${reference}`)

  // ─── 4. Extract user_id from reference (format: userId-timestamp) ───
  if (!reference) {
    console.error('[Webhook] Missing reference in payload data')
    return { received: true, warning: 'Missing reference in payload data' }
  }

  const parts = reference.split('-')
  const userId = parts[0]

  if (!userId) {
    console.error('[Webhook] Invalid reference format (could not extract userId):', reference)
    return { received: true, warning: 'Invalid reference format' }
  }

  const db = useDb()

  // ─── 5. Handle events ───
  try {
    switch (eventType) {
      case 'SALE_APPROVED': {
        // Upgrade user to pro
        await db.execute({
          sql: `UPDATE users 
                SET subscription_name = 'pro',
                    last_payment_at = CURRENT_TIMESTAMP,
                    gateway_customer_id = ?,
                    gateway_order_id = ?,
                    lemon_squeezy_order_id = ?
                WHERE id = ?`,
          args: [
            transactionData.merchant_id || '',
            transactionId,
            transactionId, // Keep LS column filled for database NOT NULL constraints/indexes compatibility
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
            transactionId, // Keep LS column filled for database NOT NULL constraints/indexes compatibility
            transactionData.payer_email || null,
            transactionData.amount || 0,
            transactionData.currency || 'COP',
            transactionData.status || 'APPROVED',
            eventType,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} upgraded to pro (transaction: ${transactionId})`)
        break
      }

      case 'VOID_APPROVED': {
        // Downgrade user back to free trial (refund/cancel)
        await db.execute({
          sql: `UPDATE users SET subscription_name = 'free_trial' WHERE id = ?`,
          args: [userId]
        })

        // Log the event
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
            'refunded',
            eventType,
            rawBody
          ]
        })

        console.log(`[Webhook] User ${userId} downgraded to free_trial due to void/refund (transaction: ${transactionId})`)
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`)
    }
  } catch (error: any) {
    console.error(`[Webhook] Error processing event ${eventType}:`, error)
    return { received: true, error: error.message }
  }

  return { received: true }
})
