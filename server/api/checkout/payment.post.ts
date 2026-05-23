import { requireVerifiedUserSession } from '../../utils/verified-session'

export default defineEventHandler(async (event) => {
  // ─── 1. Authenticate user session ───
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id

  const config = useRuntimeConfig()
  // Bold uses "llave de identidad" (identity key) for API authentication
  const boldApiKey = config.testBoldId || config.boldId

  if (!boldApiKey) {
    console.error('[Checkout] Bold API Key (llave de identidad) is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Payment gateway configuration missing' })
  }

  // ─── 2. Build unique reference and redirect URL ───
  // Reference format: userId-timestamp (max 60 chars for Bold)
  const reference = `${userId}-${Date.now()}`

  // Dynamically determine host to support both localhost dev and production
  const host = getHeader(event, 'host') || 'bringjobs.qaliby.com'
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
  const protocol = isLocalhost ? 'http' : (getHeader(event, 'x-forwarded-proto') || 'https')
  const callbackUrl = `${protocol}://${host}/dashboard?payment_ref=${encodeURIComponent(reference)}`

  console.log(`[Checkout] Creating Bold payment link for user ${userId}, reference: ${reference}`)

  // ─── 3. Call Bold API to create the Payment Link ───
  try {
    const response: any = await $fetch('https://integrations.api.bold.co/online/link/v1', {
      method: 'POST',
      headers: {
        'Authorization': `x-api-key ${boldApiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        amount_type: 'CLOSE',
        amount: {
          total_amount: 32500,
          currency: 'COP'
        },
        description: 'Plan Pro - BringJobs',
        reference,
        callback_url: callbackUrl
      }
    })

    console.log('[Checkout] Bold API response:', JSON.stringify(response))

    // Bold returns the URL directly in the response object
    const paymentUrl = response?.url || response?.payload?.url || response?.payment_url

    if (!paymentUrl) {
      console.error('[Checkout] Bold API response is missing url:', JSON.stringify(response))
      throw createError({ statusCode: 502, statusMessage: 'Failed to create payment link from Bold' })
    }

    return { url: paymentUrl, reference }
  } catch (error: any) {
    // Log the full error details for debugging
    console.error('[Checkout] Error calling Bold API:', JSON.stringify({
      status: error?.status || error?.statusCode,
      data: error?.data,
      message: error?.message,
      response: error?.response?._data
    }))
    throw createError({
      statusCode: error?.statusCode || 502,
      statusMessage: error?.statusMessage || 'Error generating payment link'
    })
  }
})
