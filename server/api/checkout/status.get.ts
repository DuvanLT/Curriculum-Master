import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../../utils/verified-session'

export default defineEventHandler(async (event) => {
  // ─── 1. Authenticate user session ───
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id

  const query = getQuery(event)
  const reference = query.ref as string

  if (!reference) {
    throw createError({ statusCode: 400, statusMessage: 'Missing payment reference' })
  }

  // Validate the reference belongs to this user (format: userId-timestamp)
  if (!reference.startsWith(userId)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid payment reference' })
  }

  const config = useRuntimeConfig()
  const boldApiKey = config.testBoldId || config.boldId

  if (!boldApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Payment gateway not configured' })
  }

  // ─── 2. Query Bold API for the payment link status ───
  try {
    const response: any = await $fetch(`https://integrations.api.bold.co/online/link/v1/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `x-api-key ${boldApiKey}`
      }
    })

    console.log(`[Payment Status] Bold response for ref ${reference}:`, JSON.stringify(response))

    const paymentStatus = response?.status || response?.payment_status || 'UNKNOWN'

    // ─── 3. Handle payment states ───
    switch (paymentStatus) {
      case 'PAID':
      case 'APPROVED': {
        // Upgrade user to pro if not already
        const db = useDb()

        // Check if already upgraded (idempotency)
        const userResult = await db.execute({
          sql: 'SELECT subscription_name FROM users WHERE id = ?',
          args: [userId]
        })

        if (userResult.rows[0]?.subscription_name !== 'pro') {
          await db.execute({
            sql: `UPDATE users
                  SET subscription_name = 'pro',
                      subscription_source = 'bold',
                      last_payment_at = CURRENT_TIMESTAMP,
                      gateway_order_id = ?
                  WHERE id = ?`,
            args: [reference, userId]
          })

          // Log the order
          await db.execute({
            sql: `INSERT INTO orders (id, user_id, gateway_order_id, customer_email, total, currency, status, event_name, payload_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              userId,
              reference,
              session.user.email || null,
              response?.amount?.total || 32500,
              'COP',
              'APPROVED',
              'FALLBACK_STATUS_CHECK',
              JSON.stringify(response)
            ]
          })

          console.log(`[Payment Status] User ${userId} upgraded to pro via fallback status check`)
        }

        return { status: 'APPROVED', message: '¡Pago aprobado! Tu plan ha sido actualizado.' }
      }

      case 'PROCESSING': {
        return { status: 'PROCESSING', message: 'Tu pago está siendo procesado. Por favor espera unos momentos.' }
      }

      case 'REJECTED':
      case 'CANCELLED': {
        return { status: 'REJECTED', message: 'El pago fue rechazado o cancelado. Por favor intenta de nuevo.' }
      }

      case 'EXPIRED': {
        return { status: 'EXPIRED', message: 'El enlace de pago ha expirado. Genera uno nuevo.' }
      }

      case 'ACTIVE': {
        // Link exists but payment hasn't been completed yet
        return { status: 'PENDING', message: 'El pago aún no se ha completado.' }
      }

      default: {
        // NO_TRANSACTION_FOUND or unknown — don't show error, just inform
        console.log(`[Payment Status] Unknown/pending status for ref ${reference}: ${paymentStatus}`)
        return { status: 'PENDING', message: 'Verificando estado del pago...' }
      }
    }
  } catch (error: any) {
    console.error(`[Payment Status] Error querying Bold API for ref ${reference}:`, error?.data || error.message)
    // Don't throw — return a safe pending status so the UI doesn't break
    return { status: 'UNKNOWN', message: 'No fue posible verificar el estado del pago. Se actualizará automáticamente.' }
  }
})
