# Free Trial sin cuenta registrada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow anonymous visitors to import a CV, get one AI audit (quality score) and one AI job-match analysis without creating an account, tracked via an anonymous cookie + IP backup limiter, with automatic migration of results into their account on signup.

**Architecture:** A new `anonymous_trials` table (keyed by a `bj_anon_id` cookie) tracks one-shot usage flags (`import_used`, `audit_used`, `analyze_used`) and stores extracted profile/results as JSON. New public `/api/trial/*` endpoints (excluded from the global session-auth middleware) mirror the existing `/api/import`, `/api/cv-audit`, `/api/analyze` endpoints but operate on the anonymous row instead of a user session. A new public page `/free-trial` drives the flow end-to-end. On signup, `anonymous_trials` data is migrated into the new user's profile and `job_analyses` history via a shared `saveUserProfile()` helper (extracted from `profile.post.ts`).

**Tech Stack:** Nuxt 4 (SSR, H3/Nitro auto-imports), nuxt-auth-utils, Turso/libsql (`useDb()`), OpenAI `gpt-4o-mini` (`openai` package), `unpdf` for PDF text extraction, `uuid`, `node:crypto`, @nuxtjs/i18n.

**Note on testing:** This repo has no test framework (no vitest/jest, no test scripts in `package.json`). Verification steps below are functional/manual: `npm run dev` + `Invoke-WebRequest`/`curl` against endpoints (checking JSON shape, `Set-Cookie` headers, repeat-call 403s), direct DB queries against the Turso `anonymous_trials` table, and manual browser checks for UI changes. Import/audit/analyze verification calls will make real (small-cost) OpenAI `gpt-4o-mini` calls.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `server/utils/db.ts` | Modify | Add `anonymous_trials` table to `initDb()` |
| `server/utils/anon-trial.ts` | Create | `getOrCreateAnonId`, `getAnonId`, `clearAnonId`, `getClientIpHash` — anonymous visitor identity + IP creation limiter |
| `server/utils/rate-limit.ts` | Modify | Add `checkAnonAIRateLimit` (IP-keyed), extract shared `getClientIp` |
| `server/utils/profile.ts` | Create | `saveUserProfile()` extracted from `profile.post.ts` |
| `server/api/profile.post.ts` | Modify | Use `saveUserProfile()` |
| `server/middleware/auth.ts` | Modify | Exclude `/api/trial/` from session requirement |
| `server/api/trial/import.post.ts` | Create | Anonymous CV import (adapted from `import.post.ts`) |
| `server/api/trial/audit.post.ts` | Create | Anonymous CV audit (adapted from `cv-audit.post.ts`) |
| `server/api/trial/analyze.post.ts` | Create | Anonymous JD match analysis (adapted from `analyze.post.ts`) |
| `server/api/trial/status.get.ts` | Create | Read-only status for returning anonymous visitors |
| `server/api/auth/signup.post.ts` | Modify | Migrate `anonymous_trials` row into new user on signup |
| `app/middleware/auth.global.ts` | Modify | Add `/free-trial` to `publicRoutes` |
| `app/pages/free-trial.vue` | Create | Public single-screen free trial flow |
| `app/pages/landing.vue` | Modify | `primaryCta` → `/free-trial` for logged-out visitors |
| `i18n/locales/es.json`, `i18n/locales/en.json` | Modify | New `free_trial` namespace + `seo.free_trial` |

---

## Task 1: Database schema — `anonymous_trials` table

**Files:**
- Modify: `server/utils/db.ts`

- [ ] **Step 1: Add the `anonymous_trials` table to `initDb()`**

In `server/utils/db.ts`, insert the following block right after the `orders` table's `ALTER TABLE orders ADD COLUMN gateway_order_id TEXT` try/catch (i.e. right before the `// ─── Indexes for performance ───` comment, around line 242):

```typescript
  await db.execute(`
    CREATE TABLE IF NOT EXISTS anonymous_trials (
      id TEXT PRIMARY KEY,
      ip_hash TEXT,
      profile_json TEXT,
      experiences_json TEXT,
      educations_json TEXT,
      import_used INTEGER DEFAULT 0,
      audit_used INTEGER DEFAULT 0,
      audit_result_json TEXT,
      analyze_used INTEGER DEFAULT 0,
      jd_text TEXT,
      analysis_result_json TEXT,
      migrated_to_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
```

The resulting file should read (excerpt):

```typescript
  try {
    await db.execute('ALTER TABLE orders ADD COLUMN gateway_order_id TEXT')
  } catch (e: any) {
    // Column might already exist, ignore error
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS anonymous_trials (
      id TEXT PRIMARY KEY,
      ip_hash TEXT,
      profile_json TEXT,
      experiences_json TEXT,
      educations_json TEXT,
      import_used INTEGER DEFAULT 0,
      audit_used INTEGER DEFAULT 0,
      audit_result_json TEXT,
      analyze_used INTEGER DEFAULT 0,
      jd_text TEXT,
      analysis_result_json TEXT,
      migrated_to_user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ─── Indexes for performance ───
```

- [ ] **Step 2: Verify the table is created on next server start**

Run: `npm run dev` (from `ats-master/`)

Then, in a separate terminal, query Turso directly to confirm the table exists (replace with your DB inspection method, e.g. via `turso db shell <db-name>` or any Turso client):

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='anonymous_trials';
```

Expected: one row returned with `name = anonymous_trials`. (The table is created lazily on the first `/api/*` request via `initDbOnce()` in `server/middleware/db.ts`, so make at least one request, e.g. open `http://localhost:3000/login`, before checking.)

- [ ] **Step 3: Commit**

```bash
git add server/utils/db.ts
git commit -m "feat: add anonymous_trials table for free trial flow"
```

---

## Task 2: Anonymous visitor identity utility

**Files:**
- Create: `server/utils/anon-trial.ts`

- [ ] **Step 1: Create `server/utils/anon-trial.ts`**

```typescript
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
```

- [ ] **Step 2: Verify the cookie is set on first request**

Run: `npm run dev` (from `ats-master/`)

Once Task 6 (trial/import) exists this can be tested end-to-end, but at this stage just confirm the file compiles by checking the dev server starts without TypeScript errors:

Run: `npm run dev`
Expected: server starts without errors mentioning `anon-trial.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/utils/anon-trial.ts
git commit -m "feat: add anonymous visitor identity utility for free trial"
```

---

## Task 3: Anonymous AI rate limiting

**Files:**
- Modify: `server/utils/rate-limit.ts`

- [ ] **Step 1: Extract shared `getClientIp` helper and add `checkAnonAIRateLimit`**

Replace the full contents of `server/utils/rate-limit.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify existing rate limits still work**

Run: `npm run dev`
Expected: server starts without errors. The auth rate limit (`checkIpRateLimit`) and AI rate limit (`checkUserAIRateLimit`) are used unchanged elsewhere (e.g. `server/middleware/rate-limit.ts`, `server/api/import.post.ts`) — confirm no TypeScript import errors are printed for those files.

- [ ] **Step 3: Commit**

```bash
git add server/utils/rate-limit.ts
git commit -m "feat: add IP-based AI rate limit for anonymous trial endpoints"
```

---

## Task 4: Extract `saveUserProfile()` helper

**Files:**
- Create: `server/utils/profile.ts`
- Modify: `server/api/profile.post.ts`

- [ ] **Step 1: Create `server/utils/profile.ts` with the extracted persistence logic**

```typescript
import { v4 as uuidv4 } from 'uuid'

function buildEducationSummary(educations: any[]) {
  return educations
    .map(edu => [edu.titulo, edu.institucion, edu.fin || edu.inicio].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n')
}

function pickColumn(availableColumns: Set<string>, candidates: string[]) {
  return candidates.find(column => availableColumns.has(column)) || null
}

async function getEducationSchema(db: ReturnType<typeof useDb>) {
  const result = await db.execute('PRAGMA table_info(educations)')
  const columns = result.rows
    .map((row: any) => String(row.name || row.column_name || '').trim())
    .filter(Boolean)

  return new Set(columns)
}

export interface SaveUserProfileInput {
  profile: any
  educations: any[]
  experiences: any[]
}

/**
 * Persists a user's profile, educations, and experiences. Used by
 * `/api/profile` (authenticated edits) and by the signup migration of
 * `anonymous_trials` data.
 */
export async function saveUserProfile(db: ReturnType<typeof useDb>, userId: string, input: SaveUserProfileInput) {
  const profile = input.profile || {}
  const educations = Array.isArray(input.educations) ? input.educations : []
  const experiences = Array.isArray(input.experiences) ? input.experiences : []

  const educationSummary = educations.length
    ? buildEducationSummary(educations)
    : (profile.educacion || '')
  const availableColumns = await getEducationSchema(db)
  const userIdColumn = pickColumn(availableColumns, ['user_id', 'userId'])
  const statements: Array<{ sql: string; args?: any[] }> = []

  statements.push({
    sql: `UPDATE users SET
      email_profile = ?,
      name = ?,
      titulo = ?,
      ubicacion = ?,
      resumen = ?,
      telefono = ?,
      linkedin = ?,
      github = ?,
      web = ?,
      educacion = ?,
      years = ?,
      idiomas = ?
      WHERE id = ?`,
    args: [
      profile.email_profile,
      profile.nombre,
      profile.titulo,
      profile.ubicacion,
      profile.resumen,
      profile.telefono,
      profile.linkedin,
      profile.otros || profile.github || '',
      profile.web,
      educationSummary,
      profile.years,
      JSON.stringify(
        Array.isArray(profile.idiomas)
          ? profile.idiomas
          : (typeof profile.idiomas === 'string'
            ? profile.idiomas.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [])
      ),
      userId
    ]
  })

  if (userIdColumn) {
    statements.push({
      sql: `DELETE FROM educations WHERE ${userIdColumn} = ?`,
      args: [userId]
    })

    if (educations.length > 0) {
      const idColumn = pickColumn(availableColumns, ['id'])
      const titleColumn = pickColumn(availableColumns, ['titulo', 'title', 'degree', 'name'])
      const institutionColumn = pickColumn(availableColumns, ['institucion', 'institution', 'school', 'academy'])
      const startColumn = pickColumn(availableColumns, ['inicio', 'start_date', 'start', 'fecha_inicio', 'from_date'])
      const endColumn = pickColumn(availableColumns, ['fin', 'end_date', 'end', 'fecha_fin', 'to_date'])
      const descriptionColumn = pickColumn(availableColumns, ['descripcion', 'description', 'details'])

      for (const edu of educations) {
        const columns: string[] = []
        const values: any[] = []

        if (idColumn) {
          columns.push(idColumn)
          values.push(edu.id || uuidv4())
        }

        columns.push(userIdColumn)
        values.push(userId)

        if (titleColumn) {
          columns.push(titleColumn)
          values.push(edu.titulo || '')
        }

        if (institutionColumn) {
          columns.push(institutionColumn)
          values.push(edu.institucion || '')
        }

        if (startColumn) {
          columns.push(startColumn)
          values.push(edu.inicio || null)
        }

        if (endColumn) {
          columns.push(endColumn)
          values.push(edu.fin || null)
        }

        if (descriptionColumn) {
          columns.push(descriptionColumn)
          values.push(edu.descripcion || null)
        }

        if (columns.length > 1) {
          statements.push({
            sql: `INSERT INTO educations (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            args: values
          })
        }
      }
    }
  }

  statements.push({
    sql: 'DELETE FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  for (const exp of experiences) {
    statements.push({
      sql: `INSERT INTO experiences (id, user_id, empresa, cargo, inicio, fin, logros, skills, type, link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        exp.id || uuidv4(),
        userId,
        exp.empresa,
        exp.cargo,
        exp.inicio,
        exp.fin || null,
        exp.logros || null,
        JSON.stringify(exp.skills || []),
        exp.type === 'project' ? 'project' : 'work',
        exp.link || null
      ]
    })
  }

  await db.batch(statements, 'write')
}
```

- [ ] **Step 2: Update `server/api/profile.post.ts` to use `saveUserProfile()`**

Replace the full contents of `server/api/profile.post.ts` with:

```typescript
import { requireVerifiedUserSession } from '../utils/verified-session'
import { saveUserProfile } from '../utils/profile'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const profile = body?.profile || {}
  const educations = Array.isArray(body?.educations) ? body.educations : []
  const experiences = Array.isArray(body?.experiences) ? body.experiences : []

  // Input validation
  const inputSize = JSON.stringify({ profile, educations, experiences }).length
  if (inputSize > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Profile data is too large (max 50,000 chars).' })
  }

  if (profile.nombre && String(profile.nombre).length > 100) profile.nombre = String(profile.nombre).substring(0, 100)
  if (profile.titulo && String(profile.titulo).length > 150) profile.titulo = String(profile.titulo).substring(0, 150)
  if (profile.resumen && String(profile.resumen).length > 2000) profile.resumen = String(profile.resumen).substring(0, 2000)

  const db = useDb()

  try {
    await saveUserProfile(db, userId, { profile, educations, experiences })
  } catch (error) {
    console.error('Error saving profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'No se pudieron guardar los cambios del perfil.'
    })
  }

  try {
    await setUserSession(event, {
      user: {
        ...session.user,
        name: profile.nombre
      }
    })
  } catch (error) {
    console.error('Error updating profile session:', error)
  }

  return { success: true }
})
```

- [ ] **Step 3: Verify profile save still works**

Run: `npm run dev`, log in with an existing test account, go to the profile page, edit a field (e.g. `titulo`), and save.

Expected: save succeeds (toast/success response), and reloading the profile page shows the updated value. Check the terminal for any errors from `profile.post.ts` or `profile.ts`.

- [ ] **Step 4: Commit**

```bash
git add server/utils/profile.ts server/api/profile.post.ts
git commit -m "refactor: extract saveUserProfile helper from profile.post.ts"
```

---

## Task 5: Exclude `/api/trial/*` from global session-auth middleware

**Files:**
- Modify: `server/middleware/auth.ts`

- [ ] **Step 1: Add the `/api/trial/` prefix to the exemption list**

Replace the full contents of `server/middleware/auth.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify existing protection is unchanged**

Run: `npm run dev`

Then, without logging in, request a protected endpoint:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/profile" -Method GET
```

Expected: `401 Unauthorized` (unchanged behavior — `/api/trial/*` doesn't exist yet so this only proves the existing protected routes are untouched).

- [ ] **Step 3: Commit**

```bash
git add server/middleware/auth.ts
git commit -m "feat: exclude /api/trial/* from global session auth middleware"
```

---

## Task 6: `POST /api/trial/import` — anonymous CV import

**Files:**
- Create: `server/api/trial/import.post.ts`

- [ ] **Step 1: Create `server/api/trial/import.post.ts`**

This mirrors `server/api/import.post.ts` but: uses `getOrCreateAnonId` + `checkAnonAIRateLimit` instead of a verified session, checks/sets `import_used` on `anonymous_trials` instead of requiring a session, and upserts the extracted profile into `anonymous_trials` instead of returning it for a logged-in user to save separately (the frontend still receives the same shape and merges it into local state).

```typescript
import OpenAI from 'openai'
import { extractText, resolvePDFJSImport } from 'unpdf'
import { getOrCreateAnonId, getClientIpHash } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class { } as any
}

function normalizeExperienceDescription(raw: unknown) {
  if (typeof raw !== 'string') return ''

  const sanitized = raw.replace(/\r/g, '\n').trim()
  if (!sanitized) return ''

  let lines = sanitized
    .split(/\n+/)
    .map(line => line.replace(/^[\-\*•\s]+/, '').trim())
    .filter(Boolean)

  if (lines.length === 1) {
    lines = sanitized
      .split(/(?<=[\.\!\?])\s+|;\s+/)
      .map(line => line.replace(/^[\-\*•\s]+/, '').trim())
      .filter(Boolean)
  }

  if (lines.length === 1) {
    lines = sanitized
      .split(/,\s+(?=[A-Z0-9])/)
      .map(line => line.replace(/^[\-\*•\s]+/, '').trim())
      .filter(Boolean)
  }

  const limited = lines.slice(0, 4).join('\n')
  return limited
}

function hasProjectSignals(text: string) {
  return /(projects?|portfolio|personal projects?|academic projects?|side projects?|open source|hackathon|capstone|tesis|proyecto[s]?|freelance)/i.test(text)
}

function normalizeImportedEntry(exp: any) {
  return {
    ...exp,
    type: exp?.type === 'project' ? 'project' : 'work',
    logros: normalizeExperienceDescription(exp?.logros)
  }
}

function dedupeEntries(entries: any[]) {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    const key = [
      entry.type === 'project' ? 'project' : 'work',
      String(entry.cargo || '').trim().toLowerCase(),
      String(entry.empresa || '').trim().toLowerCase(),
      String(entry.inicio || '').trim().toLowerCase()
    ].join('|')

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()
  const existing = await db.execute({
    sql: 'SELECT import_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  if (existing.rows[0] && Number(existing.rows[0].import_used) === 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu importación gratuita. Crea una cuenta para continuar.'
    })
  }

  await resolvePDFJSImport()

  let text = ''
  let locale = 'es'

  const contentType = getHeader(event, 'content-type')
  if (contentType?.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const file = formData?.find(f => f.name === 'file')
    const localeField = formData?.find(f => f.name === 'locale')
    if (localeField) {
      locale = localeField.data.toString()
    }

    if (file && file.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is too large (max 5MB).'
      })
    }

    if (file && (file.type === 'application/pdf' || file.name?.endsWith('.pdf'))) {
      try {
        const uint8ArrayData = new Uint8Array(file.data)
        const result = await extractText(uint8ArrayData, { mergePages: true })
        text = String(result.text || '')
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw createError({
          statusCode: 422,
          message: `No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`
        })
      }
    } else if (file) {
      text = file.data.toString('utf-8')
    }
  } else {
    const body = await readBody(event)
    text = body.text
    if (body.locale) {
      locale = body.locale
    }
  }

  const isEn = locale === 'en'

  if (!text || text.trim().length < 10) {
    throw createError({
      statusCode: 422,
      message: 'No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = isEn
    ? `
You are an expert in recruitment and professional data extraction.
Your task is to receive text from a LinkedIn profile or a CV and extract the structured information needed to populate a master profile.

IMPORTANT:
- Extract as much detail as possible.
- If the text is in Spanish, translate the descriptive fields to English.
- The "years" field must be an integer representing the approximate total years of work experience.
- Distinguish between work experience and projects.
- Use "type": "work" for real work experience at a company, contract, freelance, or professional role.
- Use "type": "project" for personal, academic, portfolio projects, hackathons, non-work internships, or one-off initiatives.
- If an entry is not clearly work experience, do not add its time to the "years" field.
- The "logros" field for each experience should have enough context and preferably exceed 300 characters when the source info allows it.
- You can use between 2 and 4 lines as a format guide, but prioritize richness of context over a strict number of line breaks.
- Each block of "logros" must provide context, responsibility, stack, action, deliverable, or result.
- Do not return poor single-sentence descriptions if the source text allows extracting more detail.
- If you don't find a section, leave it as an empty string "".

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
{
  "nombre": "Full name",
  "titulo": "Current position / Professional title",
  "ubicacion": "City, Country or professional location",
  "email_profile": "email",
  "telefono": "phone number",
  "years": 5,
  "linkedin": "https://www.linkedin.com/in/username/",
  "otros": "https://professional_page/username or any other relevant professional link",
  "web": "https://www.username.com",
  "educacion": "Short legacy summary of education",
  "educations": [
    {
      "titulo": "Name of the study",
      "institucion": "Institution",
      "inicio": "Month Year",
      "fin": "Month Year or Present",
      "descripcion": "Focus, degree, emphasis or additional context"
    }
  ],
  "resumen": "Professional summary of 2-3 lines",
  "experiences": [
    {
      "type": "work",
      "cargo": "Job title",
      "empresa": "Company name or project name",
      "inicio": "Month Year",
      "fin": "Month Year (or 'Present')",
      "logros": "Descriptive block with context, action, stack and result. Ideally over 300 characters.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`
    : `
Eres un experto en reclutamiento y extraccion de datos profesionales.
Tu tarea es recibir el texto de un perfil de LinkedIn o de un CV y extraer la informacion estructurada necesaria para llenar un perfil maestro.

IMPORTANTE:
- Extrae la mayor cantidad de detalles posible.
- Si el texto esta en ingles, traduce los campos descriptivos al espanol.
- El campo "years" debe ser un numero entero con los anos de experiencia laboral total aproximada.
- Distingue entre experiencia laboral y proyecto.
- Usa "type": "work" cuando sea experiencia laboral real en empresa, contrato, freelance o rol profesional.
- Usa "type": "project" cuando sea proyecto personal, academico, portafolio, hackathon, practica no laboral o iniciativa puntual.
- Si una entrada no es claramente experiencia laboral, no sumes su tiempo al campo "years".
- El campo "logros" de cada experiencia debe tener suficiente contexto y preferiblemente superar 300 caracteres cuando la informacion fuente lo permita.
- Puedes usar entre 2 y 4 lineas como guia de formato, pero prioriza riqueza de contexto sobre el numero estricto de saltos de linea.
- Cada bloque de "logros" debe aportar contexto, responsabilidad, stack, accion, entregable o resultado.
- No devuelvas descripciones pobres de una sola frase si el texto fuente permite extraer mas detalle.
- Si no encuentras un apartado, dejalo como string vacio "".

DEVUELVE UNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA EXACTA:
{
  "nombre": "Nombre completo",
  "titulo": "Cargo actual / Titulo profesional",
  "ubicacion": "Ciudad, Pais o ubicacion profesional",
  "email_profile": "email",
  "telefono": "telefono",
  "years": 5,
  "linkedin": "https://www.linkedin.com/in/nombre-usuario/",
  "otros": "https://pagina_profesional/nombre-usuario o cualquier otro enlace profesional relevante",
  "web": "https://www.nombre-usuario.com",
  "educacion": "Resumen corto legacy de educacion",
  "educations": [
    {
      "titulo": "Nombre del estudio",
      "institucion": "Institucion",
      "inicio": "Mes Ano",
      "fin": "Mes Ano o Actual",
      "descripcion": "Enfoque, grado, enfasis o contexto adicional"
    }
  ],
  "resumen": "Resumen profesional de 2-3 lineas",
  "experiences": [
    {
      "type": "work",
      "cargo": "Nombre del cargo",
      "empresa": "Nombre de la empresa o nombre del proyecto",
      "inicio": "Mes Ano",
      "fin": "Mes Ano (o 'Actual')",
      "logros": "Bloque descriptivo con contexto, accion, stack y resultado. Idealmente superior a 300 caracteres.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `TEXTO A PROCESAR:\n\n${text}` }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No se recibio respuesta de la IA')

    const parsed = JSON.parse(content)

    if (parsed?.email && !parsed?.email_profile) {
      parsed.email_profile = parsed.email
    }

    if (parsed?.github && !parsed?.otros) {
      parsed.otros = parsed.github
    }

    parsed.ubicacion = parsed?.ubicacion || ''

    if (Array.isArray(parsed?.educations)) {
      parsed.educations = parsed.educations.map((edu: any) => ({
        ...edu,
        titulo: edu?.titulo || '',
        institucion: edu?.institucion || '',
        inicio: edu?.inicio || '',
        fin: edu?.fin || '',
        descripcion: edu?.descripcion || ''
      }))
    } else {
      parsed.educations = []
    }

    if (!parsed.educacion && parsed.educations.length) {
      parsed.educacion = parsed.educations
        .map((edu: any) => [edu.titulo, edu.institucion, edu.fin || edu.inicio].filter(Boolean).join(' | '))
        .join('\n')
    }

    if (Array.isArray(parsed?.experiences)) {
      parsed.experiences = parsed.experiences.map((exp: any) => normalizeImportedEntry(exp))
    }

    const alreadyHasProjects = Array.isArray(parsed?.experiences) && parsed.experiences.some((exp: any) => exp?.type === 'project')

    if (!alreadyHasProjects && hasProjectSignals(text)) {
      const truncatedText = text.slice(0, 6000)
      const projectResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
Eres un extractor especializado en proyectos dentro de CVs.
Tu tarea es leer el texto y devolver SOLO proyectos relevantes que aparezcan en secciones como Projects, Personal Projects, Portfolio, Open Source, Hackathons, Freelance, Academic Projects, Thesis o equivalentes.

REGLAS:
- Devuelve solamente entradas de tipo "project".
- Si el CV menciona proyecto personal, proyecto academico, open source, portafolio, freelance puntual o hackathon, incluyelo.
- No confundas empleos formales con proyectos.
- El campo "logros" debe ser descriptivo y, cuando haya suficiente informacion, idealmente superar 300 caracteres.
- Si no encuentras proyectos claros, devuelve "experiences": [].

DEVUELVE UNICAMENTE JSON:
{
  "experiences": [
    {
      "type": "project",
      "cargo": "Rol o aporte en el proyecto",
      "empresa": "Nombre del proyecto",
      "inicio": "Mes Ano",
      "fin": "Mes Ano o Actual",
      "logros": "Bloque descriptivo con contexto, accion, stack, entregable e impacto cuando aplique.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`
          },
          {
            role: 'user',
            content: `TEXTO A PROCESAR:\n\n${truncatedText}`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const projectContent = projectResponse.choices[0]?.message?.content
      if (projectContent) {
        const parsedProjects = JSON.parse(projectContent)
        const importedProjects = Array.isArray(parsedProjects?.experiences)
          ? parsedProjects.experiences.map((exp: any) => normalizeImportedEntry({ ...exp, type: 'project' }))
          : []

        parsed.experiences = dedupeEntries([
          ...(Array.isArray(parsed.experiences) ? parsed.experiences : []),
          ...importedProjects
        ])
      }
    }

    const { educations: parsedEducations, experiences: parsedExperiences, ...profileFields } = parsed

    await db.execute({
      sql: `INSERT INTO anonymous_trials (id, ip_hash, profile_json, experiences_json, educations_json, import_used)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              ip_hash = excluded.ip_hash,
              profile_json = excluded.profile_json,
              experiences_json = excluded.experiences_json,
              educations_json = excluded.educations_json,
              import_used = 1`,
      args: [
        anonId,
        getClientIpHash(event),
        JSON.stringify(profileFields),
        JSON.stringify(parsedExperiences || []),
        JSON.stringify(parsedEducations || [])
      ]
    })

    return parsed
  } catch (e: any) {
    console.error('Trial Import Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Error procesando la importacion: ' + (e.message || 'Error desconocido')
    })
  }
})
```

- [ ] **Step 2: Verify the endpoint end-to-end**

Run: `npm run dev`

From a browser (so cookies persist) or with a cookie jar in a script, POST a small text-based PDF or plain text body to the endpoint. Example using PowerShell with a session object to capture cookies:

```powershell
$session = $null
$form = @{ text = "Juan Perez. Desarrollador Backend con 5 anios de experiencia en Node.js y SQL." ; locale = "es" }
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/trial/import" -Method POST -Body ($form | ConvertTo-Json) -ContentType "application/json" -SessionVariable session
$response.Content
$response.Headers["Set-Cookie"]
```

Expected:
- HTTP 200, JSON body shaped like the existing `/api/import` response (`nombre`, `titulo`, `experiences`, `educations`, etc.)
- `Set-Cookie` header includes `bj_anon_id=...`

Then verify the DB row was created/updated:

```sql
SELECT id, import_used, profile_json IS NOT NULL as has_profile FROM anonymous_trials;
```

Expected: one row with `import_used = 1` and `has_profile = 1`.

Repeat the same request reusing `$session` (so the `bj_anon_id` cookie is sent again):

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/trial/import" -Method POST -Body ($form | ConvertTo-Json) -ContentType "application/json" -WebSession $session
```

Expected: HTTP 403 with message "Ya usaste tu importación gratuita. Crea una cuenta para continuar."

- [ ] **Step 3: Commit**

```bash
git add server/api/trial/import.post.ts
git commit -m "feat: add anonymous trial CV import endpoint"
```

---

## Task 7: `POST /api/trial/audit` — anonymous CV audit

**Files:**
- Create: `server/api/trial/audit.post.ts`

- [ ] **Step 1: Create `server/api/trial/audit.post.ts`**

This mirrors `server/api/cv-audit.post.ts` but: no session; requires an existing `anonymous_trials` row with `profile_json` (created by `/api/trial/import`); checks `audit_used`; overwrites `profile_json`/`experiences_json` with the body's `profile`/`experiences` (so migration uses the latest in-memory edits) and stores `audit_result_json`; does **not** insert into `job_analyses`.

```typescript
import OpenAI from 'openai'
import { getOrCreateAnonId } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()
  const existing = await db.execute({
    sql: 'SELECT profile_json, audit_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  const row = existing.rows[0] as any
  if (!row || !row.profile_json) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero debes importar tu CV.'
    })
  }
  if (Number(row.audit_used) === 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu auditoría gratuita. Crea una cuenta para continuar.'
    })
  }

  const { profile, experiences, locale = 'es' } = await readBody(event)
  const isEn = locale === 'en'

  // Validate input size
  const inputSize = JSON.stringify({ profile, experiences }).length
  if (inputSize > 30000) {
    throw createError({ statusCode: 400, statusMessage: 'Input data is too large (max 30,000 characters).' })
  }

  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OpenAI API key missing' })
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  const systemPrompt = isEn
    ? `
You are an expert in recruitment and professional CV review. 
Your task is to audit a candidate's profile and provide an honest diagnosis of their current CV quality, without comparing it to any specific job listing.

INSTRUCTIONS:
1. Evaluate the overall strength of the profile (experiences, skills, title, summary, years of experience).
2. Calculate a score from 0 to 100 reflecting how complete, clear, and compelling the CV is.
3. Identify the 3 strengths of the profile (what the candidate already does well).
4. Identify 3 concrete areas for improvement that the BringJobs platform can help solve.
   - Phrase these opportunities positively and action-oriented.
   - Examples: "Automatically adapt your CV to each job listing using AI", "Detect missing keywords for specific industries", "Quantify your achievements to pass stricter ATS filters".
   - DO NOT use negative or critical tone.
5. Provide a 2-line executive recommendation that connects the profile with the platform's potential.
6. You must reply in English.
`
    : `
Eres un experto en reclutamiento y revisión de CVs profesionales. 
Tu tarea es auditar el perfil de un candidato y darle un diagnóstico honesto de la calidad de su CV actual, sin compararlo con ninguna vacante específica.

INSTRUCCIONES:
1. Evalúa la solidez general del perfil (experiencias, habilidades, título, resumen, años de experiencia).
2. Calcula un score de 0 a 100 que refleje qué tan completo, claro y convincente es el CV.
3. Identifica los 3 puntos fuertes del perfil (lo que el candidato ya hace bien).
4. Identifica 3 oportunidades de mejora concretas que la plataforma BringJobs puede ayudarle a resolver.
   - Formula estas oportunidades en positivo y orientadas a la acción de la plataforma.
   - Ejemplos de tono correcto: "Adaptar tu CV automáticamente a cada vacante con IA", "Detectar keywords que te faltan en sectores específicos", "Cuantificar tus logros para pasar filtros ATS más exigentes".
   - NO uses tono negativo ni crítico hacia el candidato. El candidato ya valió por llegar hasta aquí.
5. Da una recomendación ejecutiva en 2 líneas motivadora que conecte el perfil con el potencial de la plataforma.
6. Responde siempre en Español.
`

  const userPrompt = isEn
    ? `
CANDIDATE PROFILE:
${JSON.stringify({ profile, experiences })}

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
{
  "score": 72,
  "fortalezas": [
    "Clearly documented professional experience with well-defined roles.",
    "Solid and up-to-date skill set aligned with the target industry.",
    "Quantifiable achievements present in the listed experiences."
  ],
  "debilidades": [
    "The professional summary is generic and does not differentiate the candidate.",
    "Missing metrics or quantifiable impact in recent experiences.",
    "No personal projects or portfolio to reinforce the professional profile."
  ],
  "recomendacion": "Your profile has a solid foundation but needs more specificity. Prioritize quantifying your achievements and customizing your summary for each type of job."
}
`
    : `
PERFIL DEL CANDIDATO:
${JSON.stringify({ profile, experiences })}

DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
{
  "score": 72,
  "fortalezas": [
    "Experiencia profesional claramente documentada con roles bien definidos.",
    "Stack tecnologico o set de habilidades solido y actualizado.",
    "Logros cuantificables presentes en las experiencias listadas."
  ],
  "debilidades": [
    "El resumen profesional es muy generico y no diferencia al candidato.",
    "Faltan metricas o impacto cuantificable en las experiencias mas recientes.",
    "No hay proyectos personales ni portfolio que refuerce el perfil profesional."
  ],
  "recomendacion": "Tu perfil tiene una base solida pero necesita mas especificidad. Prioriza cuantificar tus logros y personalizar tu resumen para cada tipo de vacante."
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    const result = JSON.parse(content)

    await db.execute({
      sql: `UPDATE anonymous_trials SET profile_json = ?, experiences_json = ?, audit_result_json = ?, audit_used = 1 WHERE id = ?`,
      args: [
        JSON.stringify(profile || {}),
        JSON.stringify(experiences || []),
        JSON.stringify(result),
        anonId
      ]
    })

    return result
  } catch (e: any) {
    console.error('Trial CV Audit Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al auditar el CV'
    })
  }
})
```

- [ ] **Step 2: Verify the endpoint end-to-end**

Run: `npm run dev`. Using the same `$session` from Task 6 (so `bj_anon_id` is sent), call:

```powershell
$body = @{ profile = @{ titulo = "Desarrollador Backend"; years = "5"; resumen = "Backend dev" }; experiences = @(); locale = "es" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/trial/audit" -Method POST -Body $body -ContentType "application/json" -WebSession $session
```

Expected: HTTP 200, JSON body with `score`, `fortalezas`, `debilidades`, `recomendacion`.

Verify the DB row:

```sql
SELECT audit_used, audit_result_json IS NOT NULL as has_audit FROM anonymous_trials WHERE id = '<the anon id>';
```

Expected: `audit_used = 1`, `has_audit = 1`.

Repeat the same request with the same `$session`:

Expected: HTTP 403 with message "Ya usaste tu auditoría gratuita. Crea una cuenta para continuar."

Also verify that calling `/api/trial/audit` with a **fresh** session (no prior `/api/trial/import`) returns HTTP 400 "Primero debes importar tu CV."

- [ ] **Step 3: Commit**

```bash
git add server/api/trial/audit.post.ts
git commit -m "feat: add anonymous trial CV audit endpoint"
```

---

## Task 8: `POST /api/trial/analyze` — anonymous JD match analysis

**Files:**
- Create: `server/api/trial/analyze.post.ts`

- [ ] **Step 1: Create `server/api/trial/analyze.post.ts`**

This mirrors `server/api/analyze.post.ts` but: no session, no `FREE_TRIAL_LIMITS`/`isProUser` check (the `analyze_used` flag is the limit); requires an existing `anonymous_trials` row (created by `/api/trial/import`); checks `analyze_used`; stores `jd_text` and `analysis_result_json`; does **not** touch `profile_json`/`experiences_json` and does **not** insert into `job_analyses`.

```typescript
import OpenAI from 'openai'
import { getOrCreateAnonId } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()
  const existing = await db.execute({
    sql: 'SELECT analyze_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  const row = existing.rows[0] as any
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero debes importar tu CV.'
    })
  }
  if (Number(row.analyze_used) === 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu análisis gratuito. Crea una cuenta para continuar.'
    })
  }

  const { jd, profile, experiences, locale = 'es' } = await readBody(event)
  const isEn = locale === 'en'

  const jdText = String(jd || '').trim()
  if (!jdText) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Descripción de vacante requerida.'
    })
  }
  if (jdText.length > 15000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Job description is too long (max 15,000 characters).'
    })
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Fatal error.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = isEn
    ? `
    You are an expert in recruitment and ATS systems. Your task is to analyze a job description (JD) and compare it with a candidate's profile.
    
    INSTRUCTIONS:
    1. Identify the most important Hard Skills in the JD.
    2. Compare those skills with the user's profile and experiences.
    3. Calculate a match score from 0 to 100.
    4. Provide a brief analysis and concrete recommendations.
    5. Language: English.

    IMPORTANT: This is NOT just for programmers. It can be for SALES, MARKETING, MEDICINE, CONSTRUCTION, etc. Extract technical/specific skills from ANY field.
  `
    : `
    Eres un experto en reclutamiento y sistemas ATS. Tu tarea es analizar una vacante (JD) y compararla con el perfil de un candidato.
    
    INSTRUCCIONES:
    1. Identifica las Hard Skills (Habilidades Técnicas) más importantes de la vacante.
    2. Compara esas habilidades con el perfil y experiencias del usuario.
    3. Calcula un puntaje de coincidencia (score) de 0 a 100.
    4. Proporciona un análisis breve y recomendaciones concretas.
    5. Idioma: Español.

    IMPORTANTE: Esto NO es solo para programadores. Puede ser para VENTAS, MARKETING, MEDICINA, CONSTRUCCIÓN, etc. Extrae las habilidades técnicas/específicas de CUALQUIER campo.
  `

  const slimProfile = {
    titulo: profile?.titulo || '',
    years: profile?.years || '0',
    skills: profile?.skills || '',
    resumen: profile?.resumen || ''
  }
  const slimExperiences = Array.isArray(experiences)
    ? experiences.map((e: any) => ({ cargo: e.cargo, empresa: e.empresa, skills: e.skills, logros: typeof e.logros === 'string' ? e.logros.slice(0, 300) : '' }))
    : []

  const userPrompt = isEn
    ? `
    JOB DESCRIPTION (JD):
    ${jd}

    USER PROFILE:
    ${JSON.stringify({ profile: slimProfile, experiences: slimExperiences })}

    RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE SPANISH KEYS):
    {
      "score": 85,
      "company": "Apple",
      "position": "Frontend Developer",
      "keywords_presentes": ["Skill A", "Skill B"],
      "keywords_faltantes": ["Skill C", "Skill D"],
      "hard_skills_jd": [
        { "skill": "Skill Name", "count": 3 } 
      ],
      "analisis": "Your profile has a match...",
      "recomendaciones": ["Improve X", "Learn Y"]
    }
    * Note: 'hard_skills_jd' must be a list of the most mentioned or important skills in the JD with an estimated importance (count).
    * Note: If 'company' or 'position' cannot be detected from the JD, set their value to null.
    * IMPORTANT: The JSON keys MUST remain exactly as shown above (e.g. keywords_presentes, analisis, etc.).
  `
    : `
    VACANTE (JD):
    ${jd}

    PERFIL DEL USUARIO:
    ${JSON.stringify({ profile: slimProfile, experiences: slimExperiences })}

    DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
    {
      "score": 85,
      "company": "Apple",
      "position": "Frontend Developer",
      "keywords_presentes": ["Skill A", "Skill B"],
      "keywords_faltantes": ["Skill C", "Skill D"],
      "hard_skills_jd": [
        { "skill": "Nombre Skill", "count": 3 } 
      ],
      "analisis": "Tu perfil tiene una coincidencia...",
      "recomendaciones": ["Mejora X", "Aprende Y"]
    }
    * Nota: 'hard_skills_jd' debe ser una lista de las habilidades más mencionadas o importantes en la vacante con una estimación de su importancia (count).
    * Nota: Si no se puede detectar 'company' o 'position' en la vacante, asigna su valor a null.
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    const result = JSON.parse(content)

    await db.execute({
      sql: `UPDATE anonymous_trials SET jd_text = ?, analysis_result_json = ?, analyze_used = 1 WHERE id = ?`,
      args: [jd, content, anonId]
    })

    return result
  } catch (e: any) {
    console.error('Trial Analysis Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al realizar el análisis con IA'
    })
  }
})
```

- [ ] **Step 2: Verify the endpoint end-to-end**

Run: `npm run dev`. Using the same `$session` (after import + audit), call:

```powershell
$body = @{ jd = "Buscamos Desarrollador Backend con experiencia en Node.js, SQL y APIs REST."; profile = @{ titulo = "Desarrollador Backend"; years = "5" }; experiences = @(); locale = "es" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/trial/analyze" -Method POST -Body $body -ContentType "application/json" -WebSession $session
```

Expected: HTTP 200, JSON body with `score`, `company`, `position`, `keywords_presentes`, `keywords_faltantes`, `hard_skills_jd`, `analisis`, `recomendaciones`.

Verify the DB row:

```sql
SELECT analyze_used, jd_text, analysis_result_json IS NOT NULL as has_analysis FROM anonymous_trials WHERE id = '<the anon id>';
```

Expected: `analyze_used = 1`, `jd_text` matches the submitted JD, `has_analysis = 1`.

Repeat the same request with the same `$session`:

Expected: HTTP 403 with message "Ya usaste tu análisis gratuito. Crea una cuenta para continuar."

- [ ] **Step 3: Commit**

```bash
git add server/api/trial/analyze.post.ts
git commit -m "feat: add anonymous trial JD match analysis endpoint"
```

---

## Task 9: `GET /api/trial/status` — read-only status for returning visitors

**Files:**
- Create: `server/api/trial/status.get.ts`

- [ ] **Step 1: Create `server/api/trial/status.get.ts`**

This endpoint does **not** call `getOrCreateAnonId` (it must not create a cookie/row for first-time visitors) — it only reads via `getAnonId`.

```typescript
import { getAnonId } from '../../utils/anon-trial'

export default defineEventHandler(async (event) => {
  const anonId = getAnonId(event)

  const empty = {
    importUsed: false,
    auditUsed: false,
    analyzeUsed: false,
    profile: null,
    experiences: [] as any[],
    auditResult: null,
    jdText: '',
    analysisResult: null
  }

  if (!anonId) return empty

  const db = useDb()
  const result = await db.execute({
    sql: `SELECT profile_json, experiences_json, import_used, audit_used, audit_result_json,
                 analyze_used, jd_text, analysis_result_json
          FROM anonymous_trials WHERE id = ?`,
    args: [anonId]
  })

  const row = result.rows[0] as any
  if (!row) return empty

  return {
    importUsed: Boolean(row.import_used),
    auditUsed: Boolean(row.audit_used),
    analyzeUsed: Boolean(row.analyze_used),
    profile: row.profile_json ? JSON.parse(row.profile_json as string) : null,
    experiences: row.experiences_json ? JSON.parse(row.experiences_json as string) : [],
    auditResult: row.audit_result_json ? JSON.parse(row.audit_result_json as string) : null,
    jdText: row.jd_text || '',
    analysisResult: row.analysis_result_json ? JSON.parse(row.analysis_result_json as string) : null
  }
})
```

- [ ] **Step 2: Verify the endpoint**

Run: `npm run dev`.

Without any cookie (fresh `Invoke-WebRequest`, no `-WebSession`):

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/trial/status" -Method GET
```

Expected: HTTP 200, body equals the `empty` shape (`importUsed: false`, `auditUsed: false`, `analyzeUsed: false`, `profile: null`, `experiences: []`, `auditResult: null`, `jdText: ""`, `analysisResult: null`).

With the `$session` from Tasks 6-8 (after import/audit/analyze were used):

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/trial/status" -Method GET -WebSession $session
```

Expected: HTTP 200, `importUsed: true`, `auditUsed: true`, `analyzeUsed: true`, `profile` populated, `auditResult` populated, `analysisResult` populated, `jdText` matches what was analyzed.

- [ ] **Step 3: Commit**

```bash
git add server/api/trial/status.get.ts
git commit -m "feat: add anonymous trial status endpoint"
```

---

## Task 10: Migrate anonymous trial data on signup

**Files:**
- Modify: `server/api/auth/signup.post.ts`

- [ ] **Step 1: Add migration logic to `server/api/auth/signup.post.ts`**

Replace the full contents of `server/api/auth/signup.post.ts` with:

```typescript
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getAnonId, clearAnonId } from '../../utils/anon-trial'
import { saveUserProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  /* throw createError({
     statusCode: 403,
     statusMessage: 'Registration is currently disabled for Closed Beta.'
   })*/

  const body = await readBody(event)
  const { email, password, name, locale = 'es' } = body
  const isEn = locale === 'en'

  // Email validation regex (basic pattern)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato de correo electrónico inválido.'
    })
  }

  if (!password || password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña debe tener al menos 8 caracteres.'
    })
  }

  // Password complexity: Uppercase, Number, Symbol
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (!hasUppercase || !hasNumber || !hasSymbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña debe incluir al menos una mayúscula, un número y un símbolo especial.'
    })
  }

  const db = useDb()

  // Check if user exists
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email]
  })

  if (existingUser.rows.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User already exists'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const id = uuidv4()

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

  await db.execute({
    sql: 'INSERT INTO users (id, email, email_profile, password, name, is_verified, verification_code, preferred_locale, subscription_name) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    args: [id, email, null, hashedPassword, name || null, verificationCode, locale, 'free_trial']
  })

  // ─── Migrate anonymous trial data, if any ───
  try {
    const anonId = getAnonId(event)
    if (anonId) {
      const trialResult = await db.execute({
        sql: `SELECT profile_json, experiences_json, educations_json, audit_result_json,
                     jd_text, analysis_result_json
              FROM anonymous_trials
              WHERE id = ? AND migrated_to_user_id IS NULL`,
        args: [anonId]
      })
      const trial = trialResult.rows[0] as any

      if (trial?.profile_json) {
        const profile = JSON.parse(trial.profile_json as string)
        const experiences = trial.experiences_json ? JSON.parse(trial.experiences_json as string) : []
        const educations = trial.educations_json ? JSON.parse(trial.educations_json as string) : []

        await saveUserProfile(db, id, { profile, educations, experiences })

        if (trial.audit_result_json) {
          const auditResult = JSON.parse(trial.audit_result_json as string)
          await db.execute({
            sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              id,
              'Auditoría inicial de CV',
              'Auditoría General',
              'Diagnóstico de perfil',
              auditResult.score || 0,
              JSON.stringify({
                keywords_presentes: auditResult.fortalezas || [],
                keywords_faltantes: auditResult.debilidades || [],
                analisis: auditResult.recomendacion || '',
                recomendaciones: auditResult.debilidades || [],
                hard_skills_jd: []
              })
            ]
          })
        }

        if (trial.analysis_result_json) {
          const analysisResult = JSON.parse(trial.analysis_result_json as string)
          await db.execute({
            sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              id,
              trial.jd_text || '',
              (analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null') ? analysisResult.company : null,
              (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : null,
              analysisResult.score || 0,
              trial.analysis_result_json
            ]
          })
        }

        await db.execute({
          sql: 'UPDATE anonymous_trials SET migrated_to_user_id = ? WHERE id = ?',
          args: [id, anonId]
        })

        clearAnonId(event)
      }
    }
  } catch (error) {
    console.error('Error migrating anonymous trial data:', error)
  }

  // Send verification email
  const config = useRuntimeConfig()
  if (config.resendApiKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(config.resendApiKey)

      const emailSubject = isEn ? 'Verification Code - BringJobs' : 'Código de verificación - Bring Jobs'
      const emailTitle = isEn ? `Hello ${name || 'user'}!` : `¡Hola ${name || 'usuario'}!`
      const emailBody = isEn 
        ? 'Thanks for joining BringJobs. To complete your registration, use the following verification code:'
        : 'Gracias por unirte a Bring Jobs. Para completar tu registro, utiliza el siguiente código de verificación:'
      const emailFooter = isEn
        ? 'If you did not request this registration, please ignore this email.'
        : 'Si no solicitaste este registro, por favor ignora este correo.'

      await resend.emails.send({
        from: 'no-reply@wikisportco.com',
        to: email,
        subject: emailSubject,
        html: `
         <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h1 style="color: #2563eb; text-align: center;">BringJobs</h1>
           <p style="font-size: 16px; color: #333;">${emailTitle}</p>
           <p style="font-size: 16px; color: #333;">${emailBody}</p>
           <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
             <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${verificationCode}</span>
           </div>
           <p style="font-size: 14px; color: #666; text-align: center;">${emailFooter}</p>
         </div>
       `
      })
    } catch (error) {
      console.error('Error sending email with Resend:', error)
      // We don't block registration if email fails for now, but we might want to in production
    }
  }

  const user = { id, email, name, is_verified: 0, preferred_locale: locale, subscription_name: 'free_trial', last_payment_at: null }

  // Set session
  await setUserSession(event, { user })

  return { user }
})
```

- [ ] **Step 2: Verify migration end-to-end**

Run: `npm run dev`. Using the browser (so cookies persist across requests):

1. Visit `http://localhost:3000/free-trial`, complete the import + audit + analyze flow (Tasks 6-8 verified this works via API; now do it through the UI once Task 13 is done — for now, this step can be done with `Invoke-WebRequest` + `-WebSession` to populate an `anonymous_trials` row as in Tasks 6-8).
2. Note the `bj_anon_id` cookie value and confirm the row exists with `import_used=1`, `audit_used=1`, `analyze_used=1`.
3. With the **same cookie/session**, call signup:

```powershell
$signupBody = @{ email = "trial-test@example.com"; password = "Passw0rd!"; name = "Trial Test"; locale = "es" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/signup" -Method POST -Body $signupBody -ContentType "application/json" -WebSession $session
```

Expected: HTTP 200, `{ "user": { "id": "...", "email": "trial-test@example.com", ... } }`.

4. Query the DB:

```sql
SELECT titulo, resumen FROM users WHERE email = 'trial-test@example.com';
SELECT COUNT(*) FROM experiences WHERE user_id = (SELECT id FROM users WHERE email = 'trial-test@example.com');
SELECT jd_text, score FROM job_analyses WHERE user_id = (SELECT id FROM users WHERE email = 'trial-test@example.com');
SELECT migrated_to_user_id FROM anonymous_trials WHERE id = '<the anon id>';
```

Expected:
- `users.titulo`/`resumen` populated from the trial profile.
- `experiences` rows exist for the new user (if the trial CV had experiences).
- Two `job_analyses` rows: one with `jd_text = 'Auditoría inicial de CV'`, one with the analyzed JD text — both with non-zero `score`.
- `anonymous_trials.migrated_to_user_id` equals the new user's id.

5. Check `Set-Cookie` in the signup response clears `bj_anon_id` (look for `bj_anon_id=;` or an expired `Max-Age=0`).

6. Also verify the "no trial data" path still works: sign up with a brand-new browser session (no `bj_anon_id` cookie) and confirm signup succeeds normally with no errors in the server log.

- [ ] **Step 3: Commit**

```bash
git add server/api/auth/signup.post.ts
git commit -m "feat: migrate anonymous trial data into user account on signup"
```

---

## Task 11: Add `/free-trial` to public routes

**Files:**
- Modify: `app/middleware/auth.global.ts`

- [ ] **Step 1: Add `/free-trial` to `publicRoutes`**

In `app/middleware/auth.global.ts`, change line 5 from:

```typescript
  const publicRoutes = ['/landing', '/login', '/signup', '/forgot-password', '/select-lang']
```

to:

```typescript
  const publicRoutes = ['/landing', '/login', '/signup', '/forgot-password', '/select-lang', '/free-trial']
```

The full file becomes:

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()
  
  // Define public routes that don't require login
  const publicRoutes = ['/landing', '/login', '/signup', '/forgot-password', '/select-lang', '/free-trial']
  
  // If the user is on the root path, landing handles it (index.vue redirects to landing)
  if (to.path === '/' || publicRoutes.includes(to.path)) {
    return
  }

  // If not logged in and trying to access a protected route, redirect to login
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Visit `http://localhost:3000/free-trial` in an incognito/private window (no session). Confirm it does NOT redirect to `/login` (it will currently 404 or show a blank page since the page doesn't exist yet — that's expected until Task 13; the important thing is it's not redirected).

- [ ] **Step 3: Commit**

```bash
git add app/middleware/auth.global.ts
git commit -m "feat: add /free-trial to public routes"
```

---

## Task 12: Add `free_trial` i18n namespace

**Files:**
- Modify: `i18n/locales/es.json`
- Modify: `i18n/locales/en.json`

- [ ] **Step 1: Add `free_trial` namespace to `i18n/locales/es.json`**

Find this block (end of the `importar_cv` namespace, right before `"auth": {`):

```json
    "toast_error": "Hubo un error al procesar tu archivo. Por favor intenta de nuevo."
  },
  "auth": {
```

Replace it with:

```json
    "toast_error": "Hubo un error al procesar tu archivo. Por favor intenta de nuevo."
  },
  "free_trial": {
    "title": "Prueba tu CV gratis",
    "subtitle": "Sin registro. Sube tu CV y descubre tu potencial en segundos.",
    "upload_title": "Sube tu CV",
    "upload_desc": "Analizaremos tu CV con IA y te daremos un diagnóstico instantáneo de calidad.",
    "upload_text": "Haz clic para subir tu CV (PDF)",
    "btn_start": "Analizar mi CV",
    "loading_import_title": "Analizando tu CV...",
    "loading_import_desc": "Estamos extrayendo tu información y preparando tu diagnóstico.",
    "audit_title": "Diagnóstico de tu CV",
    "audit_score_label": "Puntuación general de calidad · ",
    "score_solid": "Perfil sólido",
    "score_potential": "Perfil con potencial",
    "score_needs_improvement": "Necesita mejoras",
    "strengths_title": "Lo que haces bien",
    "weaknesses_title": "Lo que BringJobs mejorará contigo",
    "jd_card_title": "¿Tienes una vacante en mente?",
    "jd_card_desc": "Pega la descripción de una vacante y descubre qué tan bien calza tu perfil.",
    "jd_placeholder": "Pega aquí la descripción de la vacante...",
    "btn_analyze": "Analizar coincidencia",
    "loading_analyze_title": "Comparando tu perfil con la vacante...",
    "loading_analyze_desc": "Esto tomará solo unos segundos.",
    "result_title": "Resultado del análisis",
    "match": "Match",
    "detected_company": "Empresa detectada",
    "company_not_found": "No detectada",
    "position": "Posición",
    "position_not_found": "No detectada",
    "detailed_analysis": "Análisis detallado",
    "recommendations": "Recomendaciones",
    "keywords_present": "Palabras clave presentes",
    "keywords_missing": "Palabras clave faltantes",
    "cta_title": "Crea tu cuenta gratis",
    "cta_desc": "Guarda este resultado, genera tu CV optimizado con IA y aplica a más vacantes sin límites.",
    "cta_btn": "Crear cuenta gratis",
    "already_used_title": "Ya usaste tu prueba gratuita",
    "already_used_desc": "Crea una cuenta gratis para seguir optimizando tu CV sin límites.",
    "toast_error": "Hubo un error al procesar tu archivo. Por favor intenta de nuevo.",
    "toast_audit_error": "Error al generar el diagnóstico. Por favor intenta de nuevo.",
    "toast_analysis_error": "Error al realizar el análisis con IA.",
    "toast_already_used": "Ya usaste esta función. Crea una cuenta para continuar."
  },
  "auth": {
```

- [ ] **Step 2: Add `seo.free_trial` to `i18n/locales/es.json`**

Find this block (end of the `seo` object):

```json
    "signup": {
      "title": "Crea tu Cuenta Gratis | Únete a BringJobs Hoy",
      "description": "Regístrate en BringJobs y empieza a usar la inteligencia artificial para crear currículums impactantes, analizar vacantes y practicar entrevistas."
    }
  }
}
```

Replace it with:

```json
    "signup": {
      "title": "Crea tu Cuenta Gratis | Únete a BringJobs Hoy",
      "description": "Regístrate en BringJobs y empieza a usar la inteligencia artificial para crear currículums impactantes, analizar vacantes y practicar entrevistas."
    },
    "free_trial": {
      "title": "Prueba Gratis | Analiza tu CV con IA - BringJobs",
      "description": "Sube tu CV, recibe un diagnóstico de calidad con IA y compáralo con una vacante real. Sin necesidad de crear una cuenta."
    }
  }
}
```

- [ ] **Step 3: Add `free_trial` namespace to `i18n/locales/en.json`**

Find this block (end of the `importar_cv` namespace, right before `"auth": {`):

```json
    "toast_error": "There was an error processing your file. Please try again."
  },
  "auth": {
```

Replace it with:

```json
    "toast_error": "There was an error processing your file. Please try again."
  },
  "free_trial": {
    "title": "Try your CV for free",
    "subtitle": "No sign-up required. Upload your CV and discover your potential in seconds.",
    "upload_title": "Upload your CV",
    "upload_desc": "We'll analyze your CV with AI and give you an instant quality diagnosis.",
    "upload_text": "Click to upload your CV (PDF)",
    "btn_start": "Analyze my CV",
    "loading_import_title": "Analyzing your CV...",
    "loading_import_desc": "We are extracting your information and preparing your diagnosis.",
    "audit_title": "Diagnosis of your CV",
    "audit_score_label": "Overall quality score · ",
    "score_solid": "Solid profile",
    "score_potential": "Profile with potential",
    "score_needs_improvement": "Needs improvement",
    "strengths_title": "What you do well",
    "weaknesses_title": "What BringJobs will improve with you",
    "jd_card_title": "Got a job listing in mind?",
    "jd_card_desc": "Paste a job description and find out how well your profile matches.",
    "jd_placeholder": "Paste the job description here...",
    "btn_analyze": "Analyze match",
    "loading_analyze_title": "Comparing your profile with the job listing...",
    "loading_analyze_desc": "This will only take a few seconds.",
    "result_title": "Analysis result",
    "match": "Match",
    "detected_company": "Detected company",
    "company_not_found": "Not detected",
    "position": "Position",
    "position_not_found": "Not detected",
    "detailed_analysis": "Detailed analysis",
    "recommendations": "Recommendations",
    "keywords_present": "Keywords present",
    "keywords_missing": "Keywords missing",
    "cta_title": "Create your free account",
    "cta_desc": "Save this result, generate your optimized CV with AI, and apply to more jobs without limits.",
    "cta_btn": "Create free account",
    "already_used_title": "You already used your free trial",
    "already_used_desc": "Create a free account to keep optimizing your CV without limits.",
    "toast_error": "There was an error processing your file. Please try again.",
    "toast_audit_error": "Error generating the diagnosis. Please try again.",
    "toast_analysis_error": "Error running the AI analysis.",
    "toast_already_used": "You already used this feature. Create an account to continue."
  },
  "auth": {
```

- [ ] **Step 4: Add `seo.free_trial` to `i18n/locales/en.json`**

Find this block (end of the `seo` object):

```json
    "signup": {
      "title": "Create your Free Account | Join BringJobs Today",
      "description": "Sign up for BringJobs and start using artificial intelligence to create impactful resumes, analyze job listings, and practice interviews."
    }
  }
}
```

Replace it with:

```json
    "signup": {
      "title": "Create your Free Account | Join BringJobs Today",
      "description": "Sign up for BringJobs and start using artificial intelligence to create impactful resumes, analyze job listings, and practice interviews."
    },
    "free_trial": {
      "title": "Free Trial | Analyze your CV with AI - BringJobs",
      "description": "Upload your CV, get an AI quality diagnosis, and compare it against a real job listing. No account required."
    }
  }
}
```

- [ ] **Step 5: Verify**

Run `npm run dev`. Open the browser console and run:

```javascript
fetch('/_nuxt/...')  // not needed — instead:
```

Simpler check: visit `http://localhost:3000/landing`, switch locale (es/en) using the existing language switcher, and confirm no `[intlify] Not found 'free_trial...'` warnings appear in the server/browser console (the namespace isn't rendered anywhere yet, so this just confirms both JSON files remain valid — i.e., `npm run dev` doesn't crash on a JSON parse error).

- [ ] **Step 6: Commit**

```bash
git add i18n/locales/es.json i18n/locales/en.json
git commit -m "feat: add free_trial i18n namespace"
```

---

## Task 13: `/free-trial` page

**Files:**
- Create: `app/pages/free-trial.vue`

- [ ] **Step 1: Create `app/pages/free-trial.vue`**

```vue
<template>
  <div class="trial-page min-h-dvh bg-[var(--bg)] py-12 px-4 sm:px-6">
    <div class="max-w-[640px] mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="font-head text-[28px] sm:text-[32px] font-bold text-text tracking-tighter mb-2">
          Bring<span class="text-amber">Jobs</span>
        </h1>
        <h2 class="font-head text-[20px] font-bold text-text mb-1">{{ t('free_trial.title') }}</h2>
        <p class="text-[13px] text-text-dim font-mono">{{ t('free_trial.subtitle') }}</p>
      </div>

      <!-- Status loading -->
      <div v-if="!statusLoaded" class="flex justify-center py-12">
        <div class="spinner"></div>
      </div>

      <template v-else>
        <!-- Already used, nothing left to show -->
        <AppCard v-if="status.importUsed && !auditResult" class="mb-6">
          <div class="text-center py-6">
            <span class="material-symbols-outlined text-amber text-4xl mb-3">lock_clock</span>
            <h3 class="font-head text-lg font-bold text-text mb-2">{{ t('free_trial.already_used_title') }}</h3>
            <p class="text-[13px] text-text-dim mb-5">{{ t('free_trial.already_used_desc') }}</p>
            <AppButton variant="primary" @click="goToSignup">{{ t('free_trial.cta_btn') }}</AppButton>
          </div>
        </AppCard>

        <!-- Upload card -->
        <AppCard v-if="!status.importUsed" :title="t('free_trial.upload_title')" class="mb-6 relative overflow-hidden">
          <div v-if="importing" class="absolute inset-0 z-10 bg-[var(--bg2)]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <div class="magic-loader mb-6">
              <div class="magic-circle"></div>
              <div class="magic-sparkles">
                <span class="material-symbols-outlined text-amber animate-pulse">auto_fix_high</span>
              </div>
            </div>
            <h3 class="text-lg font-bold text-text mb-2 font-head tracking-tight">{{ t('free_trial.loading_import_title') }}</h3>
            <p class="text-[13px] text-text-dim font-mono max-w-[320px]">{{ t('free_trial.loading_import_desc') }}</p>
          </div>

          <p class="text-[13px] text-text-muted leading-relaxed mb-5">{{ t('free_trial.upload_desc') }}</p>

          <div
            class="border-2 border-dashed border-border hover:border-amber/40 rounded-2xl p-10 transition-all cursor-pointer group mb-5 flex flex-col items-center justify-center bg-[var(--bg)]/40 text-center"
            @click="fileInput?.click()"
            :class="{ 'opacity-50 pointer-events-none': importing }"
          >
            <div class="w-14 h-14 bg-[var(--bg)]-bg3 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-3xl text-text-dim group-hover:text-amber">upload_file</span>
            </div>
            <div class="text-[14px] font-bold text-text">{{ t('free_trial.upload_text') }}</div>
            <input type="file" ref="fileInput" class="hidden" accept=".pdf,.txt" @change="handleFileChange" />
          </div>

          <div v-if="selectedFile" class="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="flex items-center justify-between bg-[var(--bg)]-bg3 border border-amber/30 p-4 rounded-xl">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green">task_alt</span>
                <span class="text-[13px] font-mono text-text truncate max-w-[250px]">{{ selectedFile.name }}</span>
              </div>
              <button @click="selectedFile = null" class="text-text-dim hover:text-red transition-colors">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <AppButton
            v-if="selectedFile"
            variant="primary"
            size="lg"
            class="w-full !h-14 font-bold text-lg"
            @click="runImport"
            :loading="importing"
          >
            {{ t('free_trial.btn_start') }}
          </AppButton>
        </AppCard>

        <!-- Audit result -->
        <AppCard v-if="auditResult" :title="t('free_trial.audit_title')" class="mb-6">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
              :style="{ background: `color-mix(in srgb, ${scoreColor(auditResult.score)} 12%, var(--bg3))`, border: `2px solid color-mix(in srgb, ${scoreColor(auditResult.score)} 30%, var(--border))` }"
            >
              <span class="font-head font-bold text-2xl" :style="{ color: scoreColor(auditResult.score) }">{{ auditResult.score }}</span>
            </div>
            <p class="text-[12px] font-mono text-text-dim">{{ t('free_trial.audit_score_label') }}<span :style="{ color: scoreColor(auditResult.score) }">{{ scoreLabel(auditResult.score) }}</span></p>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--green) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--green) 20%, var(--border))">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[16px]" style="color: var(--green)">thumb_up</span>
                <span class="text-[11px] font-mono uppercase tracking-widest" style="color: var(--green)">{{ t('free_trial.strengths_title') }}</span>
              </div>
              <ul class="space-y-2">
                <li v-for="(f, i) in auditResult.fortalezas" :key="i" class="flex gap-2 items-start">
                  <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style="color: var(--green)">check</span>
                  <span class="text-[13px] text-text leading-snug">{{ f }}</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--amber) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--amber) 20%, var(--border))">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[16px] text-amber">rocket_launch</span>
                <span class="text-[11px] font-mono uppercase tracking-widest text-amber">{{ t('free_trial.weaknesses_title') }}</span>
              </div>
              <ul class="space-y-2">
                <li v-for="(d, i) in auditResult.debilidades" :key="i" class="flex gap-2 items-start">
                  <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0 text-amber">auto_fix_high</span>
                  <span class="text-[13px] text-text leading-snug">{{ d }}</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--blue) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--blue) 20%, var(--border))">
              <div class="flex gap-2 items-start">
                <span class="material-symbols-outlined text-[18px] flex-shrink-0" style="color: var(--blue)">lightbulb</span>
                <p class="text-[13px] text-text leading-relaxed">{{ auditResult.recomendacion }}</p>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- JD analyze card -->
        <AppCard v-if="status.auditUsed && !status.analyzeUsed" :title="t('free_trial.jd_card_title')" class="mb-6 relative overflow-hidden">
          <div v-if="analyzing" class="absolute inset-0 z-10 bg-[var(--bg2)]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <div class="magic-loader mb-6">
              <div class="magic-circle"></div>
              <div class="magic-sparkles">
                <span class="material-symbols-outlined text-amber animate-pulse">smart_toy</span>
              </div>
            </div>
            <h3 class="text-lg font-bold text-text mb-2 font-head tracking-tight">{{ t('free_trial.loading_analyze_title') }}</h3>
            <p class="text-[13px] text-text-dim font-mono max-w-[320px]">{{ t('free_trial.loading_analyze_desc') }}</p>
          </div>

          <p class="text-[13px] text-text-muted leading-relaxed mb-4">{{ t('free_trial.jd_card_desc') }}</p>

          <AppInput type="textarea" v-model="jd" :rows="6" :placeholder="t('free_trial.jd_placeholder')" />

          <div class="flex gap-2 mt-3">
            <AppButton @click="runAnalyze" :disabled="!jd.trim()" :loading="analyzing">
              <span class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
              {{ t('free_trial.btn_analyze') }}
            </AppButton>
          </div>
        </AppCard>

        <!-- Analysis result -->
        <AppCard v-if="analysisResult" :title="t('free_trial.result_title')" class="mb-6">
          <div class="flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
            <div class="relative w-[90px] h-[90px] mt-2">
              <svg class="w-full h-full" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" stroke-width="7" />
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  fill="none"
                  :stroke="scoreColor(analysisResult.score)"
                  stroke-width="7"
                  :stroke-dasharray="`${2 * Math.PI * 38 * analysisResult.score / 100} ${2 * Math.PI * 38}`"
                  stroke-linecap="round"
                  transform="rotate(-90 45 45)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="font-head text-[20px] font-bold" :style="{ color: scoreColor(analysisResult.score) }">{{ analysisResult.score }}%</div>
                <div class="text-[9px] text-text-dim font-mono">{{ t('free_trial.match') }}</div>
              </div>
            </div>
            <div>
              <div class="mb-5 pb-4 border-b border-border/50">
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-amber uppercase font-mono tracking-widest opacity-70">{{ t('free_trial.detected_company') }}</span>
                  <span class="text-[18px] font-bold text-text">{{ (analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null') ? analysisResult.company : t('free_trial.company_not_found') }}</span>
                </div>
                <div class="flex flex-col gap-1 mt-3">
                  <span class="text-[10px] text-amber-light uppercase font-mono tracking-widest opacity-70">{{ t('free_trial.position') }}</span>
                  <span class="text-[14px] text-text-muted">{{ (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : t('free_trial.position_not_found') }}</span>
                </div>
              </div>
              <div class="mb-3">
                <div class="text-[12px] text-text-dim font-mono mb-1.5 uppercase opacity-60">{{ t('free_trial.detailed_analysis') }}</div>
                <div class="text-[13px] text-text-muted leading-relaxed">{{ analysisResult.analisis }}</div>
              </div>
              <div v-if="analysisResult.recomendaciones?.length > 0">
                <div class="text-[12px] text-text-dim font-mono mb-1.5">{{ t('free_trial.recommendations') }}</div>
                <div v-for="(r, i) in analysisResult.recomendaciones" :key="i" class="text-[12px] text-text-muted py-1 flex gap-1.5">
                  <span class="text-amber">→</span> {{ r }}
                </div>
              </div>
            </div>
          </div>
          <hr class="border-border my-4" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div class="text-[11px] text-green font-mono mb-2 uppercase tracking-wider">{{ t('free_trial.keywords_present') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in analysisResult.keywords_presentes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-emerald-500 text-white">{{ k }}</span>
              </div>
            </div>
            <div>
              <div class="text-[11px] text-red font-mono mb-2 uppercase tracking-wider">{{ t('free_trial.keywords_missing') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in analysisResult.keywords_faltantes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-red-400 text-white">{{ k }}</span>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Persistent CTA -->
        <AppCard class="mb-6">
          <div class="text-center py-2">
            <h3 class="font-head text-lg font-bold text-text mb-2">{{ t('free_trial.cta_title') }}</h3>
            <p class="text-[13px] text-text-dim mb-5">{{ t('free_trial.cta_desc') }}</p>
            <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goToSignup">
              <span class="material-symbols-outlined text-[18px] mr-2">rocket_launch</span>
              {{ t('free_trial.cta_btn') }}
            </AppButton>
          </div>
        </AppCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

interface AuditResult {
  score: number
  fortalezas: string[]
  debilidades: string[]
  recomendacion: string
}

interface AnalysisResult {
  score: number
  company: string
  position: string
  keywords_presentes: string[]
  keywords_faltantes: string[]
  hard_skills_jd: any[]
  analisis: string
  recomendaciones: string[]
}

const { t, locale } = useI18n()
const toast = useToast()

useSeoMeta({
  title: () => t('seo.free_trial.title'),
  description: () => t('seo.free_trial.description'),
  ogTitle: () => t('seo.free_trial.title'),
  ogDescription: () => t('seo.free_trial.description'),
  ogImage: 'https://bringjobs.qaliby.com/og-image.png',
  ogUrl: 'https://bringjobs.qaliby.com/free-trial',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.free_trial.title'),
  twitterDescription: () => t('seo.free_trial.description'),
  twitterImage: 'https://bringjobs.qaliby.com/og-image.png',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://bringjobs.qaliby.com/free-trial' }
  ]
})

const statusLoaded = ref(false)
const status = ref({ importUsed: false, auditUsed: false, analyzeUsed: false })

const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const analyzing = ref(false)

const profile = ref<Record<string, any> | null>(null)
const experiences = ref<any[]>([])
const auditResult = ref<AuditResult | null>(null)
const jd = ref('')
const analysisResult = ref<AnalysisResult | null>(null)

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/trial/status')
    status.value = {
      importUsed: data.importUsed,
      auditUsed: data.auditUsed,
      analyzeUsed: data.analyzeUsed
    }
    if (data.profile) {
      profile.value = data.profile
      experiences.value = data.experiences || []
    }
    if (data.auditResult) auditResult.value = data.auditResult
    if (data.jdText) jd.value = data.jdText
    if (data.analysisResult) analysisResult.value = data.analysisResult
  } catch (e) {
    console.error('Error fetching trial status:', e)
  } finally {
    statusLoaded.value = true
  }
})

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const runImport = async () => {
  if (!selectedFile.value) return
  importing.value = true

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('locale', locale.value)

  try {
    const data = await $fetch<any>('/api/trial/import', {
      method: 'POST',
      body: formData
    })

    const { educations, experiences: importedExperiences, ...profileFields } = data
    profile.value = profileFields
    experiences.value = importedExperiences || []
    status.value.importUsed = true

    await runAudit()
  } catch (e: any) {
    console.error('Error importing CV:', e)
    if (e?.statusCode === 403) {
      status.value.importUsed = true
    } else {
      toast.error(t('free_trial.toast_error'))
    }
  } finally {
    importing.value = false
  }
}

const runAudit = async () => {
  if (!profile.value) return

  try {
    const audit = await $fetch<AuditResult>('/api/trial/audit', {
      method: 'POST',
      body: {
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    auditResult.value = audit
    status.value.auditUsed = true
  } catch (e: any) {
    console.error('Error auditing CV:', e)
    if (e?.statusCode === 403) {
      status.value.auditUsed = true
    } else {
      toast.error(t('free_trial.toast_audit_error'))
    }
  }
}

const runAnalyze = async () => {
  if (!jd.value.trim() || !profile.value) return
  analyzing.value = true

  try {
    const data = await $fetch<AnalysisResult>('/api/trial/analyze', {
      method: 'POST',
      body: {
        jd: jd.value,
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    analysisResult.value = data
    status.value.analyzeUsed = true
  } catch (e: any) {
    console.error('Error analyzing JD:', e)
    if (e?.statusCode === 403) {
      status.value.analyzeUsed = true
      toast.error(t('free_trial.toast_already_used'))
    } else {
      toast.error(t('free_trial.toast_analysis_error'))
    }
  } finally {
    analyzing.value = false
  }
}

const scoreColor = (score: number) => {
  if (score >= 70) return 'var(--green)'
  if (score >= 45) return 'var(--amber)'
  return 'var(--red)'
}

const scoreLabel = (score: number) => {
  if (score >= 70) return t('free_trial.score_solid')
  if (score >= 45) return t('free_trial.score_potential')
  return t('free_trial.score_needs_improvement')
}

const goToSignup = () => {
  navigateTo('/signup')
}
</script>

<style scoped>
.trial-page {
  background-image:
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}

.magic-loader {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.magic-circle {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(var(--amber-rgb, 255, 191, 0), 0.1);
  border-top: 3px solid var(--amber);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.magic-circle::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px solid var(--amber);
  opacity: 0.2;
  border-radius: 50%;
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.magic-sparkles {
  z-index: 1;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ping {
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Using a private/incognito window:

1. Visit `http://localhost:3000/free-trial`. Confirm the page renders with title/subtitle and the upload card (no redirect to `/login`).
2. Upload a real PDF CV and click "Analizar mi CV" / "Analyze my CV". Confirm:
   - The magic-loader overlay appears with the import loading text, then switches to the analyze loading text.
   - After completion, the audit result card appears with score circle, "Lo que haces bien" / "Lo que BringJobs mejorará contigo" lists, and a recommendation block.
   - The upload card disappears (since `status.importUsed` is now `true`).
   - The "Crea tu cuenta gratis" CTA card is visible.
3. Paste a real job description into the "¿Tienes una vacante en mente?" textarea and click "Analizar coincidencia". Confirm:
   - The loading overlay appears, then the analysis result card shows the score circle, detected company/position, detailed analysis, recommendations, and keyword badges.
   - The JD textarea card disappears (since `status.analyzeUsed` is now `true`).
4. Reload the page (same cookie). Confirm:
   - Open browser dev tools Network tab — only `GET /api/trial/status` is called (no `/api/trial/import|audit|analyze`).
   - The audit result and analysis result cards render immediately from the stored data. The "Ya usaste tu prueba gratuita" card does NOT show (its condition is `status.importUsed && !auditResult`, and `auditResult` is now populated from `/api/trial/status`) — only the result cards + persistent CTA render.
5. Click "Crear cuenta gratis". Confirm navigation to `/signup`.
6. Open a fresh incognito window (new `bj_anon_id`) and confirm the flow starts clean again (empty upload card).

- [ ] **Step 3: Commit**

```bash
git add app/pages/free-trial.vue
git commit -m "feat: add /free-trial public page"
```

---

## Task 14: Point landing CTA to `/free-trial`

**Files:**
- Modify: `app/pages/landing.vue:569`

- [ ] **Step 1: Change `primaryCta` for logged-out visitors**

In `app/pages/landing.vue`, change line 569 from:

```typescript
const primaryCta = computed(() => loggedIn.value ? '/dashboard' : '/signup')
```

to:

```typescript
const primaryCta = computed(() => loggedIn.value ? '/dashboard' : '/free-trial')
```

This only affects the primary CTA buttons bound to `primaryCta`. The "Iniciar sesión" button and the footer "Crear cuenta" link (`footer_create`) keep their existing hardcoded `/login` and `/signup` targets — no other changes needed in this file.

- [ ] **Step 2: Verify**

Run `npm run dev`. Visit `http://localhost:3000/landing` in an incognito window (logged out). Confirm:
- The primary CTA button(s) (e.g., "Probar Gratis" / hero CTA) now link to `/free-trial` and clicking navigates there correctly.
- The "Iniciar sesión" button still links to `/login`.
- The footer "Crear cuenta" link still links to `/signup`.

Then log in and revisit `/landing`. Confirm the primary CTA now points to `/dashboard` (unchanged behavior for logged-in users).

- [ ] **Step 3: Commit**

```bash
git add app/pages/landing.vue
git commit -m "feat: point landing primary CTA to /free-trial for logged-out visitors"
```

---

## Task 15: End-to-end verification

**Files:** None (verification only).

- [ ] **Step 1: Full anonymous flow → signup migration, in one incognito session**

With the dev server running (`npm run dev`) and a fresh OpenAI API key configured in `.env` (`OPENAI_API_KEY`), open a new incognito window:

1. Visit `/landing`, click the primary CTA, confirm it lands on `/free-trial`.
2. Upload a real PDF CV. Confirm the audit result renders (score, fortalezas, debilidades, recomendación).
3. Paste a real job description and run the match analysis. Confirm the analysis result renders (score, company/position, keywords).
4. Click "Crear cuenta gratis" → lands on `/signup`.
5. Sign up with a new email/password. Confirm signup succeeds (HTTP 200, session set).
6. Navigate to `/dashboard` and `/profile` — confirm the profile fields (titulo, resumen, etc.) and any experiences/education extracted from the trial CV are present.
7. Navigate to `/jobs-applications` or wherever `job_analyses` history is shown (e.g., `/analysis` sidebar "Análisis recientes") — confirm two entries exist: one labeled "Auditoría inicial de CV" (from the trial audit) and one with the job description text/company/position from the trial analysis, each with a non-zero score.
8. Open dev tools → Application → Cookies. Confirm `bj_anon_id` is no longer present (cleared on signup).

- [ ] **Step 2: Verify limits and 403 messaging**

In a second fresh incognito window:

1. Visit `/free-trial`, upload a CV. Confirm the audit result appears.
2. Without reloading, manually call the import endpoint again via dev tools console:
   ```javascript
   await $fetch('/api/trial/import', { method: 'POST', body: new FormData() }).catch(e => console.log(e.statusCode, e.data))
   ```
   Expected: `403` with a message inviting signup (`"Ya usaste tu importación gratuita..."`).
3. Reload the page. Confirm the audit result and JD-analyze card (if `analyzeUsed` is still `false`) render from `/api/trial/status` without re-calling AI endpoints.

- [ ] **Step 3: Verify rate limiting and existing flows unaffected**

1. Confirm `npm run dev` starts with no TypeScript or runtime errors across all changed files.
2. As a logged-in user, visit `/import-cv`, `/dashboard`, `/profile`, and `/analysis` — confirm these still work exactly as before (unaffected by the `saveUserProfile` refactor and the new `/api/trial/*` routes).
3. As a logged-out user, attempt `GET /api/profile` directly (e.g., via `Invoke-WebRequest` with no cookies) — confirm it still returns `401 Unauthorized` (global auth middleware still protects non-`/api/trial/*`, non-`/api/auth/*` routes).

---

## Self-Review

**1. Spec coverage check** (against `docs/superpowers/specs/2026-06-11-free-trial-design.md`):

- §1 Identificación del visitante anónimo → Task 2 (`anon-trial.ts`: `getOrCreateAnonId`, IP creation cap, `checkAnonAIRateLimit` in Task 3).
- §2 Modelo de datos → Task 1 (`anonymous_trials` table, exact schema from spec).
- §3 Endpoints `/api/trial/*` → Tasks 5 (middleware exclusion), 6 (`import`), 7 (`audit`), 8 (`analyze`), 9 (`status`).
- §4 Migración al registrarse → Task 10 (`signup.post.ts`, using `saveUserProfile` from Task 4).
- §5 Frontend → Task 11 (`publicRoutes`), Task 12 (i18n), Task 13 (`free-trial.vue`), Task 14 (landing CTA).
- §6 Resumen de cambios por archivo → every row in that table maps 1:1 to a task (Tasks 1-14 + the File Structure table at the top of this plan).
- §7 Fuera de alcance → no tasks implement periodic cleanup, anonymous CV generation, or anonymous profile editing — confirmed out of scope, nothing added.

**2. Placeholder scan:** No "TBD"/"TODO"/"implement later" found. All code blocks are complete, runnable files or diffs with exact surrounding context.

**3. Type/signature consistency check:**

- `anonymous_trials` columns (`id`, `ip_hash`, `profile_json`, `experiences_json`, `educations_json`, `import_used`, `audit_used`, `audit_result_json`, `analyze_used`, `jd_text`, `analysis_result_json`, `migrated_to_user_id`, `created_at`) — used consistently across Tasks 1, 6, 7, 8, 9, 10.
- `getOrCreateAnonId(event)`, `getAnonId(event)`, `clearAnonId(event)`, `getClientIpHash(event)` (Task 2) — `getOrCreateAnonId` used in Tasks 6-8, `getAnonId`/`clearAnonId` used in Task 9/10.
- `checkAnonAIRateLimit(event)` (Task 3) — used in Tasks 6-8.
- `saveUserProfile(db, userId, { profile, educations, experiences })` (Task 4) — signature matches its use in Task 10.
- `/api/trial/status` response shape `{ importUsed, auditUsed, analyzeUsed, profile, experiences, auditResult, jdText, analysisResult }` (Task 9) — matches the fields consumed in Task 13's `onMounted`.
- `AuditResult` shape `{ score, fortalezas, debilidades, recomendacion }` and `AnalysisResult` shape `{ score, company, position, keywords_presentes, keywords_faltantes, hard_skills_jd, analisis, recomendaciones }` — consistent between Tasks 7/8 (endpoints), 9 (status), and 10/13 (consumers).
- i18n keys referenced in Task 13's template (`free_trial.*`, `seo.free_trial.*`) all exist in Task 12's additions to both `es.json` and `en.json`.

No inconsistencies found.

---
