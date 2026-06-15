import type { H3Event } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createHash } from 'node:crypto'

const ANON_COOKIE_NAME = 'bj_anon_id'
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface CreationLimitEntry {
  count: number
  resetAt: number
}

// ─── IP-based limiter for NEW anon_id creation (anti-abuse, not strict security) ───
const creationStore = new Map<string, CreationLimitEntry>()
const CREATION_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const CREATION_MAX = 5
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of creationStore) {
    if (now > entry.resetAt) {
      creationStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

function getClientIp(event: H3Event) {
  const forwarded = getHeader(event, 'x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || getRequestIP(event) || 'unknown'
}

/**
 * Returns the visitor's anonymous trial id, reading it from the `bj_anon_id`
 * cookie if present. If absent, creates a new id, sets the cookie, and
 * returns it — unless the requesting IP has already created
 * CREATION_MAX new ids within CREATION_WINDOW_MS, in which case it throws 429.
 */
export function getOrCreateAnonId(event: H3Event): string {
  const existing = getCookie(event, ANON_COOKIE_NAME)
  if (existing) return existing

  const ip = getClientIp(event)
  const now = Date.now()
  const entry = creationStore.get(ip)

  if (!entry || now > entry.resetAt) {
    creationStore.set(ip, { count: 1, resetAt: now + CREATION_WINDOW_MS })
  } else {
    entry.count++
    if (entry.count > CREATION_MAX) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many trial sessions started from this network. Please try again later.'
      })
    }
  }

  const id = uuidv4()
  setCookie(event, ANON_COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ANON_COOKIE_MAX_AGE,
    path: '/'
  })

  return id
}

/** Reads the `bj_anon_id` cookie without creating one if it's missing. */
export function getAnonId(event: H3Event): string | undefined {
  return getCookie(event, ANON_COOKIE_NAME)
}

/** Deletes the `bj_anon_id` cookie (called after migrating to a real account). */
export function clearAnonId(event: H3Event) {
  deleteCookie(event, ANON_COOKIE_NAME, { path: '/' })
}

/** SHA-256 hash of the client IP, stored for abuse auditing only. */
export function getClientIpHash(event: H3Event): string {
  const ip = getClientIp(event)
  return createHash('sha256').update(ip).digest('hex')
}
