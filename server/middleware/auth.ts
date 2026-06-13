export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const config = useRuntimeConfig()

  // Protect only /api/ routes
  if (url.pathname.startsWith('/api/')) {
    // Skip protection for authentication routes
    if (url.pathname.startsWith('/api/auth/')) {
      return
    }

    // Skip protection for webhook routes (authenticated via HMAC signature)
    if (url.pathname.startsWith('/api/webhooks/')) {
      return
    }

    // Skip protection for anonymous free-trial routes (own usage limits apply)
    if (url.pathname.startsWith('/api/trial/')) {
      return
    }

    // 1. Check for valid user session
    const session = await getUserSession(event)
    if (session?.user) {
      return
    }

    // 2. Fallback: Check for API Token (Bearer)
    const authHeader = getHeader(event, 'Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token && config.apiToken && token === config.apiToken) {
      return
    }

    // If neither session nor valid token, block request
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Session or valid API token required'
    })
  }
})
