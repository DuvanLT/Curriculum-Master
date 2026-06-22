# Login con Google (OAuth) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir "Continuar con Google" como método de login/registro en la app web Nuxt, vinculando por email a cuentas existentes y sin romper el flujo email+contraseña.

**Architecture:** Server-side OAuth redirect usando el handler nativo `defineOAuthGoogleEventHandler` de `nuxt-auth-utils`. La lógica de resolver/crear/vincular el usuario y la migración de trial anónimo se extraen a utils puros (testeables con vitest + mock de DB). El route OAuth y el frontend se verifican manualmente con un round-trip real de Google.

**Tech Stack:** Nuxt 4, nuxt-auth-utils, @libsql/client (Turso/SQLite), bcryptjs, uuid, vitest (nuevo, dev-only).

**Spec:** `docs/superpowers/specs/2026-06-17-google-login-design.md`

---

## File Structure

- `vitest.config.ts` — **Crear**. Config mínima de vitest (entorno node).
- `package.json` — **Modificar**. Añadir `vitest` (devDep) + script `test`.
- `server/utils/migrate-trial.ts` — **Crear**. `migrateAnonymousTrial(event, db, userId)` extraído de signup.
- `server/utils/google-user.ts` — **Crear**. `buildSessionUser(record)` + `resolveGoogleUser(db, profile, locale)` (find/create/link).
- `server/api/auth/signup.post.ts` — **Modificar**. Usar `migrateAnonymousTrial` en vez de la lógica embebida.
- `server/routes/auth/google.get.ts` — **Crear**. Handler OAuth de Google.
- `server/utils/db.ts` — **Modificar**. Añadir columnas `auth_provider`, `google_sub` (array de migración + whitelist).
- `nuxt.config.ts` — **Modificar**. `runtimeConfig.oauth.google`.
- `.env` — **Modificar** (manual por el usuario). Credenciales de Google.
- `app/pages/login.vue` — **Modificar**. Botón Google + manejo de `?error=google`.
- `app/pages/signup.vue` — **Modificar**. Botón Google.
- `i18n/locales/es.json` / `en.json` — **Modificar**. Strings nuevos.
- `tests/server/migrate-trial.test.ts` — **Crear**.
- `tests/server/google-user.test.ts` — **Crear**.

---

## Task 1: Infraestructura de tests (vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/sanity.test.ts`

- [ ] **Step 1: Instalar vitest**

Run:
```bash
npm install -D vitest@^2.1.0
```
Expected: se añade `vitest` a devDependencies sin errores.

- [ ] **Step 2: Añadir script de test a `package.json`**

En `package.json`, dentro de `"scripts"`, añadir la línea `"test"` (después de `"postinstall"`):

```json
    "postinstall": "nuxt prepare",
    "test": "vitest run"
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Crear test de sanity `tests/sanity.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('suma', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `npm test`
Expected: `1 passed` (test `sanity > suma`).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/sanity.test.ts
git commit -m "test: añadir vitest para lógica de servidor"
```

---

## Task 2: Util `buildSessionUser` (forma del usuario de sesión)

Centraliza la forma del objeto `user` que va a la sesión (hoy duplicada en login/signup), para que el handler de Google produzca exactamente la misma estructura.

**Files:**
- Create: `server/utils/google-user.ts`
- Test: `tests/server/google-user.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/server/google-user.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildSessionUser } from '../../server/utils/google-user'

describe('buildSessionUser', () => {
  it('mapea un registro de DB a la forma de sesión', () => {
    const record = {
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      is_verified: 1,
      preferred_locale: 'en',
      subscription_name: 'free_trial',
      last_payment_at: null,
      extra_col: 'ignored',
    }
    expect(buildSessionUser(record)).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      is_verified: 1,
      preferred_locale: 'en',
      subscription_name: 'free_trial',
      last_payment_at: null,
    })
  })

  it('aplica defaults cuando faltan campos opcionales', () => {
    const record = { id: 'u2', email: 'c@d.com', name: null, is_verified: 0 }
    expect(buildSessionUser(record)).toEqual({
      id: 'u2',
      email: 'c@d.com',
      name: null,
      is_verified: 0,
      preferred_locale: 'es',
      subscription_name: null,
      last_payment_at: null,
    })
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/server/google-user.test.ts`
Expected: FAIL — `buildSessionUser` no existe / módulo no encontrado.

- [ ] **Step 3: Implementación mínima**

Crear `server/utils/google-user.ts`:

```ts
export interface SessionUser {
  id: string
  email: string
  name: string | null
  is_verified: number
  preferred_locale: string
  subscription_name: string | null
  last_payment_at: string | null
}

export function buildSessionUser(record: any): SessionUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? null,
    is_verified: Number(record.is_verified || 0),
    preferred_locale: record.preferred_locale || 'es',
    subscription_name: record.subscription_name || null,
    last_payment_at: record.last_payment_at || null,
  }
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/server/google-user.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/google-user.ts tests/server/google-user.test.ts
git commit -m "feat: util buildSessionUser para forma de sesión"
```

---

## Task 3: Util `resolveGoogleUser` (find / create / link)

Lógica pura de decisión: dado el perfil de Google y un cliente de DB, encuentra al usuario por email, lo crea si no existe (con trial + verificado), o lo vincula. Devuelve el registro listo para `buildSessionUser` y un flag `isNew`.

**Files:**
- Modify: `server/utils/google-user.ts`
- Test: `tests/server/google-user.test.ts`

- [ ] **Step 1: Añadir tests que fallan**

Añadir al final de `tests/server/google-user.test.ts`:

```ts
import { resolveGoogleUser } from '../../server/utils/google-user'

// Mock mínimo de cliente libsql: registra SQL ejecutado y responde SELECT.
function makeDb(existingRow: any | null) {
  const calls: { sql: string; args: any[] }[] = []
  return {
    calls,
    async execute({ sql, args }: { sql: string; args: any[] }) {
      calls.push({ sql, args })
      if (/^SELECT/i.test(sql.trim())) {
        return { rows: existingRow ? [existingRow] : [] }
      }
      return { rows: [] }
    },
  }
}

const profile = { sub: 'g-123', email: 'New@Mail.com', name: 'Neo', email_verified: true }

describe('resolveGoogleUser', () => {
  it('crea un usuario nuevo verificado con free_trial cuando el email no existe', async () => {
    const db = makeDb(null)
    const { record, isNew } = await resolveGoogleUser(db as any, profile, 'en')

    expect(isNew).toBe(true)
    expect(record.email).toBe('new@mail.com') // normalizado a minúsculas
    expect(record.is_verified).toBe(1)
    expect(record.subscription_name).toBe('free_trial')
    expect(record.preferred_locale).toBe('en')
    expect(record.auth_provider).toBe('google')
    expect(record.google_sub).toBe('g-123')

    const insert = db.calls.find((c) => /INSERT INTO users/i.test(c.sql))
    expect(insert).toBeTruthy()
    // el password insertado no es null/vacío (placeholder hasheado)
    const insertedPassword = insert!.args[3]
    expect(typeof insertedPassword).toBe('string')
    expect(insertedPassword.length).toBeGreaterThan(0)
  })

  it('vincula al usuario existente conservando su suscripción y verificándolo', async () => {
    const existing = {
      id: 'u-existing',
      email: 'new@mail.com',
      name: 'Old Name',
      is_verified: 0,
      preferred_locale: 'es',
      subscription_name: 'pro',
      last_payment_at: '2026-01-01',
      google_sub: null,
    }
    const db = makeDb(existing)
    const { record, isNew } = await resolveGoogleUser(db as any, profile, 'en')

    expect(isNew).toBe(false)
    expect(record.id).toBe('u-existing')
    expect(record.subscription_name).toBe('pro') // se conserva
    expect(record.is_verified).toBe(1) // se verifica al vincular

    const update = db.calls.find((c) => /UPDATE users SET/i.test(c.sql))
    expect(update).toBeTruthy()
    expect(update!.sql).toMatch(/google_sub/)
  })

  it('no fuerza is_verified=1 si Google reporta email no verificado', async () => {
    const db = makeDb(null)
    const { record } = await resolveGoogleUser(
      db as any,
      { ...profile, email_verified: false },
      'es',
    )
    expect(record.is_verified).toBe(0)
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/server/google-user.test.ts`
Expected: FAIL — `resolveGoogleUser` no existe.

- [ ] **Step 3: Implementar `resolveGoogleUser`**

Añadir a `server/utils/google-user.ts` (junto a los imports existentes al inicio del archivo):

```ts
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export interface GoogleProfile {
  sub: string
  email: string
  name?: string | null
  email_verified?: boolean
}

interface DbClient {
  execute(stmt: { sql: string; args: any[] }): Promise<{ rows: any[] }>
}

export async function resolveGoogleUser(
  db: DbClient,
  profile: GoogleProfile,
  locale: string,
): Promise<{ record: any; isNew: boolean }> {
  const email = (profile.email || '').toLowerCase()
  const verified = profile.email_verified === false ? 0 : 1

  const existing = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as any
    const nextVerified = verified === 1 ? 1 : Number(row.is_verified || 0)
    await db.execute({
      sql: 'UPDATE users SET google_sub = ?, is_verified = ? WHERE id = ?',
      args: [profile.sub, nextVerified, row.id],
    })
    return { record: { ...row, google_sub: profile.sub, is_verified: nextVerified }, isNew: false }
  }

  const id = uuidv4()
  // Placeholder inservible: el usuario nunca lo conoce; puede usar "recuperar contraseña".
  const placeholderPassword = await bcrypt.hash(uuidv4(), 10)
  const preferred = ['es', 'en'].includes(locale) ? locale : 'es'

  await db.execute({
    sql: `INSERT INTO users
            (id, email, email_profile, password, name, is_verified, preferred_locale, subscription_name, auth_provider, google_sub)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, email, null, placeholderPassword, profile.name || null, verified, preferred, 'free_trial', 'google', profile.sub],
  })

  return {
    record: {
      id,
      email,
      name: profile.name || null,
      is_verified: verified,
      preferred_locale: preferred,
      subscription_name: 'free_trial',
      last_payment_at: null,
      auth_provider: 'google',
      google_sub: profile.sub,
    },
    isNew: true,
  }
}
```

Nota: el INSERT mantiene el orden de args usado por el test (`args[3]` = password).

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/server/google-user.test.ts`
Expected: PASS (todos los tests del archivo).

- [ ] **Step 5: Commit**

```bash
git add server/utils/google-user.ts tests/server/google-user.test.ts
git commit -m "feat: resolveGoogleUser (find/create/link por email)"
```

---

## Task 4: Extraer `migrateAnonymousTrial` a util compartido

Mueve la lógica de migración de trial anónimo de `signup.post.ts` a un util, sin cambiar comportamiento, para reutilizarla en el handler de Google.

**Files:**
- Create: `server/utils/migrate-trial.ts`
- Modify: `server/api/auth/signup.post.ts:70-142`
- Test: `tests/server/migrate-trial.test.ts`

- [ ] **Step 1: Escribir test que falla**

Crear `tests/server/migrate-trial.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'

// Mock de utils de anon-trial usados por el módulo.
vi.mock('../../server/utils/anon-trial', () => ({
  getAnonId: vi.fn(() => 'anon-1'),
  clearAnonId: vi.fn(),
}))
vi.mock('../../server/utils/profile', () => ({
  saveUserProfile: vi.fn(async () => {}),
}))

import { migrateAnonymousTrial } from '../../server/utils/migrate-trial'

function makeDb(trialRow: any | null) {
  const calls: { sql: string; args: any[] }[] = []
  return {
    calls,
    async execute({ sql, args }: { sql: string; args: any[] }) {
      calls.push({ sql, args })
      if (/FROM anonymous_trials/i.test(sql)) {
        return { rows: trialRow ? [trialRow] : [] }
      }
      return { rows: [] }
    },
  }
}

describe('migrateAnonymousTrial', () => {
  it('devuelve false cuando no hay datos de trial', async () => {
    const db = makeDb(null)
    const result = await migrateAnonymousTrial({} as any, db as any, 'user-1')
    expect(result).toBe(false)
  })

  it('migra y marca el trial cuando hay profile_json, devolviendo true', async () => {
    const trial = {
      profile_json: JSON.stringify({ nombre: 'X' }),
      experiences_json: null,
      educations_json: null,
      audit_result_json: null,
      jd_text: null,
      analysis_result_json: null,
    }
    const db = makeDb(trial)
    const result = await migrateAnonymousTrial({} as any, db as any, 'user-1')
    expect(result).toBe(true)
    const marked = db.calls.find((c) => /UPDATE anonymous_trials SET migrated_to_user_id/i.test(c.sql))
    expect(marked).toBeTruthy()
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/server/migrate-trial.test.ts`
Expected: FAIL — `migrateAnonymousTrial` no existe.

- [ ] **Step 3: Crear `server/utils/migrate-trial.ts`**

Mover aquí la lógica (líneas 70-142 de `signup.post.ts`), envuelta en una función. Devuelve `true` si migró datos:

```ts
import type { H3Event } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { getAnonId, clearAnonId } from './anon-trial'
import { saveUserProfile } from './profile'

export async function migrateAnonymousTrial(
  event: H3Event,
  db: any,
  userId: string,
): Promise<boolean> {
  try {
    const anonId = getAnonId(event)
    if (!anonId) return false

    const trialResult = await db.execute({
      sql: `SELECT profile_json, experiences_json, educations_json, audit_result_json,
                   jd_text, analysis_result_json
            FROM anonymous_trials
            WHERE id = ? AND migrated_to_user_id IS NULL`,
      args: [anonId],
    })
    const trial = trialResult.rows[0] as any
    if (!trial?.profile_json) return false

    const profile = JSON.parse(trial.profile_json as string)
    const experiences = trial.experiences_json ? JSON.parse(trial.experiences_json as string) : []
    const educations = trial.educations_json ? JSON.parse(trial.educations_json as string) : []

    await saveUserProfile(db, userId, { profile, educations, experiences })

    if (trial.audit_result_json) {
      const auditResult = JSON.parse(trial.audit_result_json as string)
      await db.execute({
        sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuidv4(),
          userId,
          'Auditoría inicial de CV',
          'Auditoría General',
          'Diagnóstico de perfil',
          auditResult.score || 0,
          JSON.stringify({
            keywords_presentes: auditResult.fortalezas || [],
            keywords_faltantes: auditResult.debilidades || [],
            analisis: auditResult.recomendacion || '',
            recomendaciones: auditResult.debilidades || [],
            hard_skills_jd: [],
          }),
        ],
      })
    }

    if (trial.analysis_result_json) {
      const analysisResult = JSON.parse(trial.analysis_result_json as string)
      await db.execute({
        sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuidv4(),
          userId,
          trial.jd_text || '',
          (analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null') ? analysisResult.company : null,
          (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : null,
          analysisResult.score || 0,
          trial.analysis_result_json,
        ],
      })
    }

    await db.execute({
      sql: 'UPDATE anonymous_trials SET migrated_to_user_id = ? WHERE id = ?',
      args: [userId, anonId],
    })

    clearAnonId(event)
    return true
  } catch (error) {
    console.error('Error migrating anonymous trial data:', error)
    return false
  }
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/server/migrate-trial.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Reemplazar la lógica embebida en `signup.post.ts`**

En `server/api/auth/signup.post.ts`:

1. Reemplazar los imports de las líneas 3-4:
```ts
import { migrateAnonymousTrial } from '../../utils/migrate-trial'
```
(elimina los imports de `getAnonId, clearAnonId` y `saveUserProfile` si ya no se usan en el archivo; verifica con búsqueda).

2. Reemplazar el bloque `// ─── Migrate anonymous trial data, if any ───` completo (desde `let fromTrial = false` hasta el `catch` que cierra en la línea ~142) por:
```ts
  // ─── Migrate anonymous trial data, if any ───
  const fromTrial = await migrateAnonymousTrial(event, db, id)
```

- [ ] **Step 6: Verificar que signup compila y arranca**

Run: `npm run build`
Expected: build sin errores de tipos/imports relacionados a signup.

- [ ] **Step 7: Verificación manual de signup (no romper regresión)**

Con `npm run dev`, registrar un usuario nuevo por email y confirmar: redirige a `/verify`, llega el código, y se puede verificar. (Confirma que la migración/no-migración sigue funcionando igual.)

- [ ] **Step 8: Commit**

```bash
git add server/utils/migrate-trial.ts server/api/auth/signup.post.ts tests/server/migrate-trial.test.ts
git commit -m "refactor: extraer migrateAnonymousTrial a util compartido"
```

---

## Task 5: Migración de esquema (columnas `auth_provider`, `google_sub`)

**Files:**
- Modify: `server/utils/db.ts:24-31` (whitelist) y `:84-106` (array de columnas)

- [ ] **Step 1: Añadir columnas a la whitelist**

En `server/utils/db.ts`, dentro de `ALLOWED_COLUMN_NAMES` (línea ~24), añadir:
```ts
  'gateway_customer_id', 'gateway_order_id',
  'auth_provider', 'google_sub'
```

- [ ] **Step 2: Añadir columnas al array de migración**

En el array `columns` de `initDb` (línea ~102-105), añadir tras `gateway_order_id`:
```ts
    { name: 'gateway_order_id', type: 'TEXT' },
    { name: 'auth_provider', type: "TEXT DEFAULT 'password'" },
    { name: 'google_sub', type: 'TEXT' }
```

- [ ] **Step 3: Aplicar la migración contra la DB**

`initDb` corre al arrancar. Levantar el dev server una vez para que aplique los ALTER:

Run: `npm run dev` (esperar a que arranque, luego cortar con Ctrl+C)
Expected: arranca sin errores; los ALTER se ejecutan (errores "duplicate column" son ignorados por diseño).

- [ ] **Step 4: Verificar columnas en la DB (Turso)**

Run:
```bash
node -e "import('@libsql/client').then(async ({createClient})=>{const c=createClient({url:process.env.NUXT_TURSO_URL,authToken:process.env.NUXT_TURSO_TOKEN});const r=await c.execute('PRAGMA table_info(users)');console.log(r.rows.map(x=>x.name).join(', '))})"
```
Expected: la lista incluye `auth_provider` y `google_sub`.

(Si las env vars no están en el shell, cargarlas desde `.env` primero o usar el dev server como verificación de que no truena.)

- [ ] **Step 5: Commit**

```bash
git add server/utils/db.ts
git commit -m "feat: columnas auth_provider y google_sub en users"
```

---

## Task 6: Config de runtime para OAuth Google

**Files:**
- Modify: `nuxt.config.ts:30-50`
- Modify: `.env` (manual por el usuario — ver Task 9)

- [ ] **Step 1: Añadir `oauth` a runtimeConfig**

En `nuxt.config.ts`, dentro de `runtimeConfig` (antes de `public:`), añadir:
```ts
    boldPaymentAmount: '',

    oauth: {
      google: {
        clientId: '',
        clientSecret: '',
      },
    },

    public: {
```
`nuxt-auth-utils` mapea `NUXT_OAUTH_GOOGLE_CLIENT_ID` / `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` a estos campos automáticamente.

- [ ] **Step 2: Verificar que el build toma la config**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Commit**

```bash
git add nuxt.config.ts
git commit -m "feat: runtimeConfig.oauth.google"
```

---

## Task 7: Server route `server/routes/auth/google.get.ts`

**Files:**
- Create: `server/routes/auth/google.get.ts`

- [ ] **Step 1: Crear el handler**

```ts
import { migrateAnonymousTrial } from '../../utils/migrate-trial'
import { buildSessionUser, resolveGoogleUser } from '../../utils/google-user'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile', 'openid'],
  },
  async onSuccess(event, { user: googleUser }) {
    const db = useDb()

    // Locale preferido: cookie i18n si existe, fallback 'es'.
    const localeCookie = getCookie(event, 'i18n_redirected')
    const locale = ['es', 'en'].includes(localeCookie || '') ? (localeCookie as string) : 'es'

    const { record, isNew } = await resolveGoogleUser(
      db,
      {
        sub: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        email_verified: googleUser.email_verified,
      },
      locale,
    )

    if (isNew) {
      await migrateAnonymousTrial(event, db, record.id)
    }

    await setUserSession(event, { user: buildSessionUser(record) })

    return sendRedirect(event, '/profile')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google')
  },
})
```

Nota: `useDb`, `setUserSession`, `getCookie`, `sendRedirect`, `defineOAuthGoogleEventHandler` están auto-importados por Nitro/Nuxt (no requieren import explícito).

- [ ] **Step 2: Verificar que el route no rompe el build**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step 3: Verificar que el route redirige a Google (sin credenciales aún falla controladamente)**

Con `npm run dev`, visitar `http://localhost:3000/auth/google`.
Expected (antes de configurar credenciales): redirige a `/login?error=google` o muestra error de config — confirma que el route existe y ejecuta `onError`. (La verificación real del happy-path es la Task 10.)

- [ ] **Step 4: Commit**

```bash
git add server/routes/auth/google.get.ts
git commit -m "feat: route OAuth de Google (find/create/link + sesión)"
```

---

## Task 8: Frontend — botones "Continuar con Google" + error

**Files:**
- Modify: `app/pages/login.vue`
- Modify: `app/pages/signup.vue`
- Modify: `i18n/locales/es.json:619` (sección `auth`)
- Modify: `i18n/locales/en.json` (sección `auth`)

- [ ] **Step 1: Añadir strings i18n en español**

En `i18n/locales/es.json`, dentro de `"auth"` (tras `"login_now"`), añadir:
```json
    "continue_with_google": "Continuar con Google",
    "or": "o",
    "google_error": "No se pudo iniciar sesión con Google. Intenta de nuevo.",
```

- [ ] **Step 2: Añadir strings i18n en inglés**

En `i18n/locales/en.json`, dentro de la sección `"auth"` correspondiente, añadir:
```json
    "continue_with_google": "Continue with Google",
    "or": "or",
    "google_error": "Could not sign in with Google. Please try again.",
```

- [ ] **Step 3: Añadir botón + separador en `login.vue`**

En `app/pages/login.vue`, justo **después** del `</form>` (línea ~25) y antes del bloque `mt-8`, insertar:
```vue
      <div class="flex items-center gap-3 my-6 relative z-10">
        <div class="h-px flex-1 bg-border"></div>
        <span class="font-mono text-[11px] text-text-dim uppercase">{{ t('auth.or') }}</span>
        <div class="h-px flex-1 bg-border"></div>
      </div>

      <a href="/auth/google"
         class="relative z-10 flex items-center justify-center gap-2 w-full h-[45px] border border-border rounded-[4px] text-[14px] font-medium text-text hover:bg-bg transition-colors">
        <img src="https://www.google.com/favicon.ico" alt="" class="w-4 h-4" />
        {{ t('auth.continue_with_google') }}
      </a>
```

- [ ] **Step 4: Mostrar error `?error=google` en `login.vue`**

En el `<script setup>` de `login.vue`, tras `const error = ref('')` (línea ~66), añadir:
```js
const route = useRoute()
onMounted(() => {
  if (route.query.error === 'google') {
    error.value = t('auth.google_error')
  }
})
```

- [ ] **Step 5: Añadir botón + separador en `signup.vue`**

En `app/pages/signup.vue`, después del `</form>` (línea ~38) y antes del bloque `mt-8`, insertar el mismo bloque del Step 3 (separador `or` + `<a href="/auth/google">`).

- [ ] **Step 6: Verificación visual**

Con `npm run dev`, abrir `/login` y `/signup`:
Expected: aparece el separador "o" y el botón "Continuar con Google" bajo el formulario; en `/login?error=google` se muestra el mensaje de error.

- [ ] **Step 7: Commit**

```bash
git add app/pages/login.vue app/pages/signup.vue i18n/locales/es.json i18n/locales/en.json
git commit -m "feat: botón Continuar con Google en login y signup"
```

---

## Task 9: Configuración manual en Google Cloud (usuario, con guía)

**Files:** ninguno de código. Edita `.env` localmente (NO commitear — ver Task 11).

- [ ] **Step 1: Crear credenciales OAuth en Google Cloud Console**

Guiar al usuario:
1. https://console.cloud.google.com → crear/seleccionar proyecto.
2. "APIs & Services" → "OAuth consent screen" → tipo External → completar app name, support email, scopes `email`, `profile`, `openid`.
3. "Credentials" → "Create Credentials" → "OAuth client ID" → tipo **Web application**.
4. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/google`
   - `https://bringjobs.qaliby.com/auth/google`
5. Copiar **Client ID** y **Client Secret**.

- [ ] **Step 2: Añadir credenciales al `.env`**

Añadir a `.env` (local):
```
NUXT_OAUTH_GOOGLE_CLIENT_ID=<client-id>
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=<client-secret>
```

- [ ] **Step 3: Reiniciar el dev server** para que tome las env vars.

Run: `npm run dev`
Expected: arranca sin errores.

---

## Task 10: Verificación end-to-end (manual)

**Files:** ninguno.

- [ ] **Step 1: Usuario NUEVO con Google**

Con sesión limpia (logout / incógnito), ir a `/login` → "Continuar con Google" → autenticar con una cuenta Google sin registro previo en la app.
Expected: redirige a `/profile`, sesión activa, **no** pide código de verificación.

- [ ] **Step 2: Verificar el registro en DB**

Consultar la fila del usuario por su email.
Expected: `is_verified=1`, `subscription_name='free_trial'`, `auth_provider='google'`, `google_sub` poblado, `password` no nulo (placeholder).

- [ ] **Step 3: Usuario EXISTENTE (email+contraseña) entra con Google**

Usar el email de un usuario creado previamente por contraseña; entrar con Google con ese mismo email.
Expected: se vincula (mismo `id`), conserva `subscription_name`, `google_sub` ahora poblado, sesión activa.

- [ ] **Step 4: Login por contraseña sigue intacto**

Hacer login con email+contraseña de un usuario existente.
Expected: funciona igual que antes (incluyendo redirección a `/verify` si `is_verified=0`).

- [ ] **Step 5: Error de OAuth**

Cancelar el consentimiento en la pantalla de Google.
Expected: vuelve a `/login?error=google` con el mensaje de error visible.

- [ ] **Step 6: Suite de tests completa verde**

Run: `npm test`
Expected: todos los tests pasan.

---

## Task 11: Higiene de secretos (verificación)

**Files:**
- Modify: `.gitignore` (si hace falta)

- [ ] **Step 1: Confirmar que `.env` está ignorado y nunca commiteado**

Run:
```bash
git check-ignore .env && git log --all --oneline -- .env
```
Expected: `check-ignore` imprime `.env` (está ignorado); `git log` no muestra commits con `.env`.

- [ ] **Step 2: Si `.env` NO está ignorado**, añadirlo a `.gitignore`:
```
.env
```
y commitear sólo el `.gitignore`:
```bash
git add .gitignore
git commit -m "chore: asegurar .env en gitignore"
```

- [ ] **Step 3: Si `.env` aparece en el historial**, avisar al usuario: las credenciales (OpenAI, Turso, Bold, Google, etc.) deben rotarse y el historial limpiarse. (Acción separada, fuera de este plan.)

---

## Notas de cierre

- El plan preserva la forma del objeto `user` de sesión (`buildSessionUser`) para no romper nada downstream (middleware de verificación, suscripción, locale).
- La verificación por email se omite sólo para usuarios cuyo email Google reporta como verificado.
- Si el dominio de producción no es `https://bringjobs.qaliby.com`, ajustar el redirect URI en Task 9 y en Google Cloud.
