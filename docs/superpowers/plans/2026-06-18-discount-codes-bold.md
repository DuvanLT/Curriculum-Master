# Códigos de descuento/afiliado con BOLD — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir códigos de descuento por vendedor en el checkout de BOLD: el comprador aplica el código (validado en el modal), paga el precio descontado, y la venta queda atribuida al código para reporte por DB.

**Architecture:** El descuento se calcula en backend (BOLD no tiene cupones) enviando un `total_amount` menor. Una tabla `checkout_sessions` (keyed por `reference`) hace de puente para que la confirmación (webhook/fallback) sepa qué código atribuir. Lógica pura (precio/descuento/lookup) en utils testeables.

**Tech Stack:** Nuxt 4, Nitro/h3, @libsql/client (Turso), vitest, @nuxtjs/i18n.

**Spec:** `docs/superpowers/specs/2026-06-18-discount-codes-bold-design.md`

---

## File Structure

- `server/utils/pricing.ts` — **Crear**. `getBasePrice(config)`, `applyDiscount(base, pct)`.
- `server/utils/discount.ts` — **Crear**. `lookupActiveDiscount(...)`, `getCheckoutDiscountCode(...)`.
- `tests/server/pricing.test.ts` — **Crear**.
- `tests/server/discount.test.ts` — **Crear**.
- `server/utils/db.ts` — **Modificar**. Tablas `discount_codes`, `checkout_sessions`; columna `orders.discount_code`.
- `server/api/checkout/validate-code.post.ts` — **Crear**. Endpoint de validación.
- `server/api/checkout/payment.post.ts` — **Modificar**. Descuento + `checkout_sessions` + precio centralizado.
- `server/api/webhooks/payment.post.ts` — **Modificar**. Atribución en `orders`.
- `server/api/checkout/status.get.ts` — **Modificar**. Atribución en `orders` (fallback) + precio centralizado.
- `app/components/UpgradeModal.vue` — **Modificar**. Campo de código + validación + envío.
- `i18n/locales/es.json` / `en.json` — **Modificar**. Strings del código.

---

## Task 1: Util `pricing.ts` (TDD)

**Files:**
- Create: `server/utils/pricing.ts`
- Test: `tests/server/pricing.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/server/pricing.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getBasePrice, applyDiscount } from '../../server/utils/pricing'

describe('getBasePrice', () => {
  it('usa boldPaymentAmount del config', () => {
    expect(getBasePrice({ boldPaymentAmount: '40000' })).toBe(40000)
    expect(getBasePrice({ boldPaymentAmount: 50000 })).toBe(50000)
  })
  it('cae a 32500 si falta o es inválido', () => {
    expect(getBasePrice({})).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: '' })).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: '0' })).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: 'abc' })).toBe(32500)
  })
})

describe('applyDiscount', () => {
  it('aplica el porcentaje y redondea a entero', () => {
    expect(applyDiscount(32500, 10)).toBe(29250)
    expect(applyDiscount(32500, 15)).toBe(27625)
  })
  it('0% deja el precio igual', () => {
    expect(applyDiscount(32500, 0)).toBe(32500)
  })
  it('acota el porcentaje a 0..100 y nunca devuelve negativo', () => {
    expect(applyDiscount(32500, 100)).toBe(0)
    expect(applyDiscount(32500, 150)).toBe(0)
    expect(applyDiscount(32500, -10)).toBe(32500)
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/server/pricing.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

Crear `server/utils/pricing.ts`:
```ts
export function getBasePrice(config: { boldPaymentAmount?: string | number }): number {
  const n = Number(config.boldPaymentAmount)
  return Number.isFinite(n) && n > 0 ? n : 32500
}

// Aplica % de descuento al precio base; redondea a entero COP. Nunca < 0.
export function applyDiscount(base: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100)
  return Math.max(0, base - Math.round((base * pct) / 100))
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/server/pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/pricing.ts tests/server/pricing.test.ts
git commit -m "feat: util pricing (precio base + descuento)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 2: Util `discount.ts` (TDD)

**Files:**
- Create: `server/utils/discount.ts`
- Test: `tests/server/discount.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/server/discount.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { lookupActiveDiscount, getCheckoutDiscountCode } from '../../server/utils/discount'

async function seedDb(): Promise<Client> {
  const db = createClient({ url: ':memory:' })
  await db.execute(`CREATE TABLE discount_codes (
    code TEXT PRIMARY KEY, seller_name TEXT NOT NULL,
    discount_percent INTEGER NOT NULL, active INTEGER DEFAULT 1
  )`)
  await db.execute(`CREATE TABLE checkout_sessions (
    reference TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    discount_code TEXT, amount INTEGER NOT NULL
  )`)
  await db.execute({ sql: 'INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES (?,?,?,?)', args: ['CODTE', 'Prueba', 15, 1] })
  await db.execute({ sql: 'INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES (?,?,?,?)', args: ['OFF', 'Inactivo', 20, 0] })
  await db.execute({ sql: 'INSERT INTO checkout_sessions (reference, user_id, discount_code, amount) VALUES (?,?,?,?)', args: ['ref-1', 'u1', 'CODTE', 27625] })
  await db.execute({ sql: 'INSERT INTO checkout_sessions (reference, user_id, discount_code, amount) VALUES (?,?,?,?)', args: ['ref-2', 'u1', null, 32500] })
  return db
}

describe('lookupActiveDiscount', () => {
  let db: Client
  beforeEach(async () => { db = await seedDb() })

  it('devuelve datos + final_amount para un código activo', async () => {
    const r = await lookupActiveDiscount(db as any, 'CODTE', 32500)
    expect(r).toEqual({ code: 'CODTE', seller_name: 'Prueba', discount_percent: 15, final_amount: 27625 })
  })
  it('null para código inactivo', async () => {
    expect(await lookupActiveDiscount(db as any, 'OFF', 32500)).toBeNull()
  })
  it('null para código inexistente', async () => {
    expect(await lookupActiveDiscount(db as any, 'NOPE', 32500)).toBeNull()
  })
})

describe('getCheckoutDiscountCode', () => {
  let db: Client
  beforeEach(async () => { db = await seedDb() })

  it('devuelve el código de la sesión', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-1')).toBe('CODTE')
  })
  it('null cuando la sesión no tiene código', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-2')).toBeNull()
  })
  it('null cuando no existe la referencia', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-x')).toBeNull()
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/server/discount.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar**

Crear `server/utils/discount.ts`:
```ts
import { applyDiscount } from './pricing'

export interface ValidatedDiscount {
  code: string
  seller_name: string
  discount_percent: number
  final_amount: number
}

interface DbClient {
  execute(stmt: { sql: string; args: any[] }): Promise<{ rows: any[] }>
}

export async function lookupActiveDiscount(
  db: DbClient,
  code: string,
  basePrice: number,
): Promise<ValidatedDiscount | null> {
  const res = await db.execute({
    sql: 'SELECT code, seller_name, discount_percent FROM discount_codes WHERE code = ? AND active = 1',
    args: [code],
  })
  const row = res.rows[0] as any
  if (!row) return null
  const percent = Number(row.discount_percent)
  return {
    code: String(row.code),
    seller_name: String(row.seller_name),
    discount_percent: percent,
    final_amount: applyDiscount(basePrice, percent),
  }
}

export async function getCheckoutDiscountCode(
  db: DbClient,
  reference: string,
): Promise<string | null> {
  const res = await db.execute({
    sql: 'SELECT discount_code FROM checkout_sessions WHERE reference = ?',
    args: [reference],
  })
  const row = res.rows[0] as any
  return row?.discount_code ? String(row.discount_code) : null
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/server/discount.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/discount.ts tests/server/discount.test.ts
git commit -m "feat: utils de descuento (lookup + atribución por referencia)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 3: Migración de esquema

**Files:**
- Modify: `server/utils/db.ts`

- [ ] **Step 1: Añadir tablas y columna en `initDb`**

En `server/utils/db.ts`, justo **después** del bloque que crea la tabla `orders` y su
`ALTER ... gateway_order_id` (el `try/catch` de la línea ~239-243), insertar:
```ts
  // ─── Discount codes (afiliados) ───
  await db.execute(`
    CREATE TABLE IF NOT EXISTS discount_codes (
      code TEXT PRIMARY KEY,
      seller_name TEXT NOT NULL,
      discount_percent INTEGER NOT NULL,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      reference TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      discount_code TEXT,
      amount INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  try {
    await db.execute('ALTER TABLE orders ADD COLUMN discount_code TEXT')
  } catch (e: any) {
    // Column might already exist, ignore error
  }
```

- [ ] **Step 2: Aplicar migración contra Turso y verificar**

Run:
```bash
node -e "require('dotenv').config();const{createClient}=require('@libsql/client');const c=createClient({url:process.env.NUXT_TURSO_URL,authToken:process.env.NUXT_TURSO_TOKEN});(async()=>{for(const sql of ['CREATE TABLE IF NOT EXISTS discount_codes (code TEXT PRIMARY KEY, seller_name TEXT NOT NULL, discount_percent INTEGER NOT NULL, active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)','CREATE TABLE IF NOT EXISTS checkout_sessions (reference TEXT PRIMARY KEY, user_id TEXT NOT NULL, discount_code TEXT, amount INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)']){await c.execute(sql)} try{await c.execute('ALTER TABLE orders ADD COLUMN discount_code TEXT')}catch(e){console.log('orders col:',(e.message||'').split('\n')[0])} const a=await c.execute('PRAGMA table_info(orders)');console.log('orders cols:',a.rows.map(r=>r.name).join(', '));console.log('tablas ok')})().catch(e=>{console.error(e);process.exit(1)})"
```
Expected: imprime las columnas de `orders` incluyendo `discount_code` y "tablas ok".

- [ ] **Step 3: Commit**

```bash
git add server/utils/db.ts
git commit -m "feat: esquema de discount_codes, checkout_sessions y orders.discount_code"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 4: Endpoint `validate-code`

**Files:**
- Create: `server/api/checkout/validate-code.post.ts`

- [ ] **Step 1: Crear el endpoint**

Crear `server/api/checkout/validate-code.post.ts`:
```ts
import { requireVerifiedUserSession } from '../../utils/verified-session'
import { getBasePrice } from '../../utils/pricing'
import { lookupActiveDiscount } from '../../utils/discount'

export default defineEventHandler(async (event) => {
  await requireVerifiedUserSession(event)

  const body = await readBody(event).catch(() => ({}))
  const code = String(body?.code || '').trim().toUpperCase()
  if (!code) {
    return { valid: false }
  }

  const db = useDb()
  const basePrice = getBasePrice(useRuntimeConfig())
  const discount = await lookupActiveDiscount(db, code, basePrice)

  if (!discount) {
    return { valid: false }
  }

  return {
    valid: true,
    code: discount.code,
    seller_name: discount.seller_name,
    discount_percent: discount.discount_percent,
    final_amount: discount.final_amount,
  }
})
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 3: Commit**

```bash
git add server/api/checkout/validate-code.post.ts
git commit -m "feat: endpoint validate-code para descuentos"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 5: Checkout con descuento

**Files:**
- Modify: `server/api/checkout/payment.post.ts`

Contenido actual de referencia (relevante): el handler arma `reference`, llama a la API
de BOLD con `amount.total_amount: 32500` y devuelve `{ url, reference }`.

- [ ] **Step 1: Imports y precio/código**

En `server/api/checkout/payment.post.ts`, reemplazar la línea de import inicial:
```ts
import { requireVerifiedUserSession } from '../../utils/verified-session'
```
por:
```ts
import { requireVerifiedUserSession } from '../../utils/verified-session'
import { getBasePrice } from '../../utils/pricing'
import { lookupActiveDiscount } from '../../utils/discount'
```

- [ ] **Step 2: Calcular monto y código aplicado**

En el handler, después de `const reference = \`${userId}-${Date.now()}\`` (línea ~19),
añadir:
```ts
  const db = useDb()
  const basePrice = getBasePrice(config)

  const rawBody = await readBody(event).catch(() => ({}))
  const code = String(rawBody?.code || '').trim().toUpperCase()

  let amount = basePrice
  let appliedCode: string | null = null
  if (code) {
    const discount = await lookupActiveDiscount(db, code, basePrice)
    if (!discount) {
      throw createError({ statusCode: 400, statusMessage: 'Código de descuento inválido' })
    }
    amount = discount.final_amount
    appliedCode = discount.code
  }
```

- [ ] **Step 3: Usar el monto en la llamada a BOLD**

En el body del `$fetch` a BOLD, reemplazar:
```ts
        amount: {
          total_amount: 32500,
          currency: 'COP'
        },
```
por:
```ts
        amount: {
          total_amount: amount,
          currency: 'COP'
        },
```

- [ ] **Step 4: Persistir la sesión de checkout antes de devolver**

Reemplazar el bloque de retorno exitoso:
```ts
    if (!paymentUrl) {
      console.error('[Checkout] Bold API response is missing url:', JSON.stringify(response))
      throw createError({ statusCode: 502, statusMessage: 'Failed to create payment link from Bold' })
    }

    return { url: paymentUrl, reference }
```
por:
```ts
    if (!paymentUrl) {
      console.error('[Checkout] Bold API response is missing url:', JSON.stringify(response))
      throw createError({ statusCode: 502, statusMessage: 'Failed to create payment link from Bold' })
    }

    await db.execute({
      sql: 'INSERT INTO checkout_sessions (reference, user_id, discount_code, amount) VALUES (?, ?, ?, ?)',
      args: [reference, userId, appliedCode, amount]
    })

    return { url: paymentUrl, reference }
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 6: Commit**

```bash
git add server/api/checkout/payment.post.ts
git commit -m "feat: checkout aplica descuento y registra checkout_sessions"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 6: Atribución en la confirmación (webhook + fallback)

**Files:**
- Modify: `server/api/webhooks/payment.post.ts`
- Modify: `server/api/checkout/status.get.ts`

- [ ] **Step 1: Import en el webhook**

En `server/api/webhooks/payment.post.ts`, después de la línea
`import { v4 as uuidv4 } from 'uuid'`, añadir:
```ts
import { getCheckoutDiscountCode } from '../../utils/discount'
```

- [ ] **Step 2: Atribuir en el INSERT de SALE_APPROVED**

En el `case 'SALE_APPROVED':`, justo **antes** del `await db.execute({ sql: \`INSERT INTO orders ...`
(el INSERT de auditoría), añadir:
```ts
        const approvedDiscountCode = await getCheckoutDiscountCode(db, reference)
```
Luego reemplazar ese INSERT por la versión con la columna `discount_code`:
```ts
        await db.execute({
          sql: `INSERT INTO orders (id, user_id, gateway_order_id, customer_email, total, currency, status, event_name, payload_json, discount_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            uuidv4(),
            userId,
            transactionId,
            transactionData.payer_email || null,
            transactionData.amount?.total || 0,
            transactionData.amount?.currency || 'COP',
            'APPROVED',
            eventType,
            rawBody,
            approvedDiscountCode
          ]
        })
```

- [ ] **Step 3: Import en el fallback**

En `server/api/checkout/status.get.ts`, después de
`import { requireVerifiedUserSession } from '../../utils/verified-session'`, añadir:
```ts
import { getCheckoutDiscountCode } from '../../utils/discount'
```

- [ ] **Step 4: Atribuir en el INSERT del fallback (PAID/APPROVED)**

En `status.get.ts`, dentro del `case 'PAID': case 'APPROVED':` donde está el `INSERT INTO orders`,
justo **antes** de ese INSERT añadir:
```ts
          const fallbackDiscountCode = await getCheckoutDiscountCode(db, reference)
```
y reemplazar el INSERT por la versión con `discount_code`:
```ts
          await db.execute({
            sql: `INSERT INTO orders (id, user_id, gateway_order_id, customer_email, total, currency, status, event_name, payload_json, discount_code)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              userId,
              reference,
              session.user.email || null,
              response?.amount?.total || 32500,
              'COP',
              'APPROVED',
              'FALLBACK_STATUS_CHECK',
              JSON.stringify(response),
              fallbackDiscountCode
            ]
          })
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 6: Commit**

```bash
git add server/api/webhooks/payment.post.ts server/api/checkout/status.get.ts
git commit -m "feat: atribuir discount_code a la orden en webhook y fallback"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 7: Frontend — campo de código en `UpgradeModal.vue` + i18n

**Files:**
- Modify: `app/components/UpgradeModal.vue`
- Modify: `i18n/locales/es.json`
- Modify: `i18n/locales/en.json`

- [ ] **Step 1: i18n (es)**

En `i18n/locales/es.json`, añadir un namespace nuevo de nivel superior (después de la
llave de apertura `{`, junto a los otros namespaces):
```json
  "checkout": {
    "code_label": "¿Tienes un código de descuento?",
    "code_placeholder": "Ingresa tu código",
    "code_apply": "Aplicar",
    "code_invalid": "Código inválido o inactivo",
    "code_applied": "Código {code} ({seller}): {percent}% de descuento. Nuevo precio: ${amount} COP",
    "code_remove": "Quitar"
  },
```

- [ ] **Step 2: i18n (en)**

En `i18n/locales/en.json`, añadir el mismo namespace:
```json
  "checkout": {
    "code_label": "Have a discount code?",
    "code_placeholder": "Enter your code",
    "code_apply": "Apply",
    "code_invalid": "Invalid or inactive code",
    "code_applied": "Code {code} ({seller}): {percent}% off. New price: ${amount} COP",
    "code_remove": "Remove"
  },
```

- [ ] **Step 3: Validar JSON**

Run: `node -e "require('./i18n/locales/es.json');require('./i18n/locales/en.json');console.log('JSON ok')"`
Expected: imprime `JSON ok`.

- [ ] **Step 4: Añadir el bloque del código antes del botón CTA**

En `app/components/UpgradeModal.vue`, localizar el comentario `<!-- Call to Action -->`
(línea ~94) y, justo **antes** de él, insertar:
```html
            <!-- Discount code -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-700 mb-2">{{ t('checkout.code_label') }}</label>
              <div v-if="!appliedDiscount" class="flex gap-2">
                <input
                  v-model="codeInput"
                  type="text"
                  :placeholder="t('checkout.code_placeholder')"
                  class="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase focus:border-indigo-500 focus:outline-none"
                  @keyup.enter="applyCode"
                />
                <button
                  type="button"
                  @click="applyCode"
                  :disabled="codeLoading || !codeInput.trim()"
                  class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {{ t('checkout.code_apply') }}
                </button>
              </div>
              <p v-if="codeError" class="mt-2 text-xs font-medium text-red-600">{{ t('checkout.code_invalid') }}</p>
              <div v-if="appliedDiscount" class="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-3 py-2">
                <span class="text-xs font-medium text-green-800">
                  {{ t('checkout.code_applied', { code: appliedDiscount.code, seller: appliedDiscount.seller_name, percent: appliedDiscount.discount_percent, amount: appliedDiscount.final_amount.toLocaleString('es-CO') }) }}
                </span>
                <button type="button" @click="removeCode" class="ml-2 text-xs font-semibold text-green-700 underline">{{ t('checkout.code_remove') }}</button>
              </div>
            </div>
```

- [ ] **Step 5: Lógica en el `<script setup>`**

En `app/components/UpgradeModal.vue`, dentro del `<script setup>`, después de
`const loading = ref(false)`, añadir:
```ts
const codeInput = ref('')
const codeLoading = ref(false)
const codeError = ref(false)
const appliedDiscount = ref<{ code: string; seller_name: string; discount_percent: number; final_amount: number } | null>(null)

const applyCode = async () => {
  const code = codeInput.value.trim().toUpperCase()
  if (!code || codeLoading.value) return
  codeLoading.value = true
  codeError.value = false
  try {
    const res = await $fetch<any>('/api/checkout/validate-code', { method: 'POST', body: { code } })
    if (res?.valid) {
      appliedDiscount.value = {
        code: res.code,
        seller_name: res.seller_name,
        discount_percent: res.discount_percent,
        final_amount: res.final_amount,
      }
    } else {
      codeError.value = true
    }
  } catch {
    codeError.value = true
  } finally {
    codeLoading.value = false
  }
}

const removeCode = () => {
  appliedDiscount.value = null
  codeInput.value = ''
  codeError.value = false
}
```

- [ ] **Step 6: Enviar el código en `handleUpgrade`**

En `handleUpgrade`, reemplazar la llamada al checkout:
```ts
    const response = await $fetch<{ url: string }>('/api/checkout/payment', {
      method: 'POST'
    })
```
por:
```ts
    const response = await $fetch<{ url: string }>('/api/checkout/payment', {
      method: 'POST',
      body: { code: appliedDiscount.value?.code || undefined }
    })
```

- [ ] **Step 7: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 8: Commit**

```bash
git add app/components/UpgradeModal.vue i18n/locales/es.json i18n/locales/en.json
git commit -m "feat: campo de código de descuento en UpgradeModal"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 8: Seed CODTE + verificación final

**Files:** ninguno.

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: todos verdes (incluye `pricing` y `discount`).

- [ ] **Step 2: Insertar el código de prueba CODTE (15%)**

Run:
```bash
node -e "require('dotenv').config();const{createClient}=require('@libsql/client');const c=createClient({url:process.env.NUXT_TURSO_URL,authToken:process.env.NUXT_TURSO_TOKEN});c.execute({sql:'INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES (?,?,?,1) ON CONFLICT(code) DO UPDATE SET discount_percent=excluded.discount_percent, seller_name=excluded.seller_name, active=1',args:['CODTE','Prueba',15]}).then(()=>c.execute('SELECT code, seller_name, discount_percent, active FROM discount_codes WHERE code=?',['CODTE'])).then(r=>{console.log('CODTE:',JSON.stringify(r.rows[0]))}).catch(e=>{console.error(e);process.exit(1)})"
```
Expected: imprime `CODTE: {"code":"CODTE","seller_name":"Prueba","discount_percent":15,"active":1}`.

- [ ] **Step 3: Verificación manual (dev)**

Con `npm run dev`, abrir el modal de upgrade, escribir `CODTE` → Aplicar.
Expected: muestra "Código CODTE (Prueba): 15% de descuento. Nuevo precio: $27.625 COP".
Escribir un código inexistente → muestra "Código inválido o inactivo" sin iniciar pago.

---

## Notas de cierre

- BOLD no tiene cupones: el descuento es un `total_amount` menor que calcula el backend.
- La atribución viaja por `checkout_sessions` (referencia→código) y se graba en
  `orders.discount_code` en las dos vías de confirmación.
- El precio base se centraliza vía `getBasePrice(config)` (usa `boldPaymentAmount`,
  fallback 32500).
- Reporte por DB:
  ```sql
  SELECT d.code, d.seller_name, COUNT(*) AS ventas, SUM(o.total) AS total_recaudado
  FROM orders o JOIN discount_codes d ON o.discount_code = d.code
  WHERE o.status = 'APPROVED'
  GROUP BY d.code, d.seller_name ORDER BY ventas DESC;
  ```
