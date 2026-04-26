import { checkIpRateLimit } from '../utils/rate-limit'

const RATE_LIMITED_AUTH_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/password-reset',
  '/api/auth/verify'
]

export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  if (RATE_LIMITED_AUTH_ROUTES.some(r => url.pathname === r)) {
    checkIpRateLimit(event)
  }
})
