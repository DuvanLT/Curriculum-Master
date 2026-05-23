import { requireVerifiedUserSession } from '../../utils/verified-session'

export default defineEventHandler(async (event) => {
  // ─── 1. Authenticate user session ───
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id

  const config = useRuntimeConfig()
  const boldApiKey = config.testBoldId || config.boldId

  if (!boldApiKey) {
    console.error('[Checkout] Bold API Key is not configured')
    throw createError({ statusCode: 500, statusMessage: 'Payment gateway configuration missing' })
  }

  // ─── 2. Build unique reference and redirect URL ───
  // Max length for Bold reference is 60 characters. 
  // UUID (36 chars) + '-' (1 char) + timestamp (13 chars) = 50 chars. Fits perfectly.
  const reference = `${userId}-${Date.now()}`

  // Dynamically determine host to support both localhost dev and production
  const host = getHeader(event, 'host') || 'bringjobs.qaliby.com'
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
  const protocol = isLocalhost ? 'http' : (getHeader(event, 'x-forwarded-proto') || 'https')
  const redirectUrl = `${protocol}://${host}/dashboard`

  // ─── 3. Call Bold API to create the Payment Link ───
  try {
    const response: any = await $fetch('https://integrations.api.bold.co/online/link/v1', {
      method: 'POST',
      headers: {
        'Authorization': `x-api-key ${boldApiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        amount: 36000, // Price in COP (approx. $8.99 USD)
        amount_type: 'FIXED',
        currency: 'COP',
        description: 'Plan Pro - BringJobs',
        reference,
        redirect_url: redirectUrl
      }
    })

    const paymentUrl = response.payload?.url || response.url || response.payment_url

    if (!paymentUrl) {
      console.error('[Checkout] Bold API response is missing url:', response)
      throw createError({ statusCode: 502, statusMessage: 'Failed to create payment link from Bold' })
    }

    return { url: paymentUrl }
  } catch (error: any) {
    console.error('[Checkout] Error calling Bold API:', error?.data || error.message || error)
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.statusMessage || 'Error generating payment link'
    })
  }
})
