import type { H3Event } from 'h3'

// ─── Types ───
interface RateLimitEntry {
  count: number
  resetAt: number
}

// ─── Stores ───
const ipStore = new Map<string, RateLimitEntry>()
const userAIStore = new Map<string, RateLimitEntry>()
const anonAIStore = new Map<string, RateLimitEntry>()

// ─── Constants ───
const AUTH_WINDOW_MS = 15 * 60 * 1000   // 15 minutes
const AUTH_MAX_REQUESTS = 10             // 10 attempts per window

const AI_WINDOW_MS = 60 * 60 * 1000     // 1 hour
const AI_MAX_REQUESTS = 30              // 30 AI calls per hour per user

const ANON_AI_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const ANON_AI_MAX_REQUESTS = 10          // 10 trial AI calls per hour per IP

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Clean expired entries every 5 min

// ─── Shared helpers ───
export function getClientIp(event: H3Event) {
  const forwarded = getHeader(event, 'x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || getRequestIP(event) || 'unknown'
}

// ─── Automatic cleanup ───
function cleanStore(store: Map<string, RateLimitEntry>) {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

setInterval(() => {
  cleanStore(ipStore)
  cleanStore(userAIStore)
  cleanStore(anonAIStore)
}, CLEANUP_INTERVAL_MS)

// ─── IP-based rate limit (for auth endpoints) ───
export function checkIpRateLimit(event: H3Event) {
  const ip = getClientIp(event)
  const now = Date.now()

  const entry = ipStore.get(ip)
  if (!entry || now > entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS })
    return
  }

  entry.count++
  if (entry.count > AUTH_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.'
    })
  }
}

// ─── User-based rate limit (for AI endpoints) ───
export function checkUserAIRateLimit(userId: string) {
  const now = Date.now()

  const entry = userAIStore.get(userId)
  if (!entry || now > entry.resetAt) {
    userAIStore.set(userId, { count: 1, resetAt: now + AI_WINDOW_MS })
    return
  }

  entry.count++
  if (entry.count > AI_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'AI usage limit exceeded. Please try again in 1 hour.'
    })
  }
}

// ─── IP-based rate limit (for anonymous /api/trial/* AI endpoints) ───
export function checkAnonAIRateLimit(event: H3Event) {
  const ip = getClientIp(event)
  const now = Date.now()

  const entry = anonAIStore.get(ip)
  if (!entry || now > entry.resetAt) {
    anonAIStore.set(ip, { count: 1, resetAt: now + ANON_AI_WINDOW_MS })
    return
  }

  entry.count++
  if (entry.count > ANON_AI_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many trial requests from this network. Please try again later.'
    })
  }
}

// ─── Verification attempt limiter (per user session) ───
const verifyAttemptStore = new Map<string, { count: number; resetAt: number }>()
const VERIFY_WINDOW_MS = 15 * 60 * 1000
const VERIFY_MAX_ATTEMPTS = 5

export function checkVerifyRateLimit(userId: string) {
  const now = Date.now()

  const entry = verifyAttemptStore.get(userId)
  if (!entry || now > entry.resetAt) {
    verifyAttemptStore.set(userId, { count: 1, resetAt: now + VERIFY_WINDOW_MS })
    return
  }

  entry.count++
  if (entry.count > VERIFY_MAX_ATTEMPTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many verification attempts. Please request a new code.'
    })
  }
}
