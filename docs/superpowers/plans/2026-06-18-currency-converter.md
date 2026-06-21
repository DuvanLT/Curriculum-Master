# Módulo de conversión de divisas (COP) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widget Vue reutilizable + servicios Nitro para convertir COP a una divisa destino, con preselección por país (header de Vercel) y fallback manual a USD.

**Architecture:** Dominio puro en `shared/currency/` (importable por app y server vía `#shared`). Infra (caché, provider, cache-first service) en `server/utils/currency/`. Endpoints Nitro exponen config (con detección) y tasa (cache-first). Composable Vue con debounce consume los endpoints.

**Tech Stack:** Nuxt 4.4 (Vue) + Nitro, vitest, frankfurter.dev API, alias `#shared`.

**Spec:** `docs/superpowers/specs/2026-06-18-currency-converter-design.md`

---

## File Structure

- `shared/currency/types.ts` — value objects.
- `shared/currency/currencies.ts` — tabla de divisas soportadas + helpers.
- `shared/currency/country-currency.ts` — mapa país→divisa + resolver.
- `shared/currency/conversion.ts` — `convert()` puro.
- `server/utils/currency/cache.ts` — `CacheService<T>` TTL.
- `server/utils/currency/frankfurter.ts` — parser defensivo + `ExchangeRateProvider`/`FrankfurterProvider`.
- `server/utils/currency/currency-service.ts` — `CurrencyService` cache-first.
- `server/utils/currency/service.ts` — singleton `useCurrencyService()`.
- `server/api/currency/config.get.ts` — `{ supported, detected }`.
- `server/api/currency/rate.get.ts` — `ExchangeRate`.
- `app/composables/useCurrencyConverter.ts` — estado + debounce.
- `app/components/currency/CurrencySelector.vue`, `ConversionResult.vue`.
- `app/pages/tools/conversor.vue` — demo + preselección SSR.
- `vitest.config.ts` — añadir alias `#shared`.
- Tests en `tests/shared/` y `tests/server/`.

---

## Task 1: Dominio puro + alias vitest

**Files:**
- Modify: `vitest.config.ts`
- Create: `shared/currency/types.ts`, `shared/currency/currencies.ts`, `shared/currency/country-currency.ts`
- Test: `tests/shared/country-currency.test.ts`

- [ ] **Step 1: Añadir alias `#shared` a vitest**

Reemplazar el contenido de `vitest.config.ts` por:
```ts
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 2: Test que falla (resolver)**

Crear `tests/shared/country-currency.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'

describe('resolveCurrencyFromCountry', () => {
  it('mapea países soportados a su divisa', () => {
    expect(resolveCurrencyFromCountry('US')).toBe('USD')
    expect(resolveCurrencyFromCountry('mx')).toBe('MXN') // case-insensitive
    expect(resolveCurrencyFromCountry('ES')).toBe('EUR')
    expect(resolveCurrencyFromCountry('CL')).toBe('CLP')
  })
  it('null cuando el header/país falta', () => {
    expect(resolveCurrencyFromCountry(undefined)).toBeNull()
    expect(resolveCurrencyFromCountry(null)).toBeNull()
    expect(resolveCurrencyFromCountry('')).toBeNull()
  })
  it('null cuando el país no está soportado', () => {
    expect(resolveCurrencyFromCountry('JP')).toBeNull()
    expect(resolveCurrencyFromCountry('CO')).toBeNull() // base COP, no es destino
  })
})
```

- [ ] **Step 3: Correr (falla)**

Run: `npx vitest run tests/shared/country-currency.test.ts`
Expected: FAIL — módulos no existen.

- [ ] **Step 4: Crear `shared/currency/types.ts`**

```ts
export type SupportedCurrency = 'USD' | 'EUR' | 'MXN' | 'GBP' | 'BRL' | 'PEN' | 'CLP'
export type CurrencyCode = SupportedCurrency | 'COP'

export interface Currency {
  code: SupportedCurrency
  symbol: string
  name: string
}

export interface ExchangeRate {
  base: 'COP'
  quote: CurrencyCode
  rate: number
  date: string
}

export interface ConversionResult {
  amountCop: number
  currency: CurrencyCode
  rate: number
  result: number
  date: string
}
```

- [ ] **Step 5: Crear `shared/currency/currencies.ts`**

```ts
import type { Currency, SupportedCurrency } from './types'

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD'

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  MXN: { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  GBP: { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  CLP: { code: 'CLP', symbol: '$', name: 'Peso chileno' },
}

export const SUPPORTED_CURRENCY_LIST: Currency[] = Object.values(SUPPORTED_CURRENCIES)

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, code)
}
```

- [ ] **Step 6: Crear `shared/currency/country-currency.ts`**

```ts
import type { SupportedCurrency } from './types'
import { isSupportedCurrency } from './currencies'

// País ISO 3166-1 alpha-2 -> divisa soportada. Agregar país = 1 entrada.
export const COUNTRY_CURRENCY: Record<string, SupportedCurrency> = {
  US: 'USD', EC: 'USD', PA: 'USD', SV: 'USD',
  MX: 'MXN',
  GB: 'GBP',
  BR: 'BRL',
  PE: 'PEN',
  CL: 'CLP',
  // Eurozona
  ES: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR',
  IE: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR',
}

export function resolveCurrencyFromCountry(country?: string | null): SupportedCurrency | null {
  if (!country) return null
  const code = COUNTRY_CURRENCY[country.toUpperCase()]
  return code && isSupportedCurrency(code) ? code : null
}
```

- [ ] **Step 7: Correr (pasa)**

Run: `npx vitest run tests/shared/country-currency.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts shared/currency tests/shared/country-currency.test.ts
git commit -m "feat: dominio de divisas (tipos, config, mapa país->divisa)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 2: `convert()` (TDD)

**Files:**
- Create: `shared/currency/conversion.ts`
- Test: `tests/shared/conversion.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/shared/conversion.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { convert } from '#shared/currency/conversion'

describe('convert', () => {
  it('aplica la fórmula cantidadCOP * rate', () => {
    expect(convert(100000, 0.000289)).toBeCloseTo(28.9, 5)
    expect(convert(0, 0.000289)).toBe(0)
  })
  it('lanza con monto inválido (negativo o NaN)', () => {
    expect(() => convert(-1, 0.000289)).toThrow()
    expect(() => convert(Number.NaN, 0.000289)).toThrow()
  })
  it('lanza con tasa inválida', () => {
    expect(() => convert(1000, -1)).toThrow()
    expect(() => convert(1000, Number.NaN)).toThrow()
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/shared/conversion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `shared/currency/conversion.ts`**

```ts
export function convert(amountCop: number, rate: number): number {
  if (!Number.isFinite(amountCop) || amountCop < 0) {
    throw new Error('Monto inválido')
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Tasa inválida')
  }
  return amountCop * rate
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/shared/conversion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/currency/conversion.ts tests/shared/conversion.test.ts
git commit -m "feat: ConversionService (fórmula pura COP->destino)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 3: `CacheService<T>` (TDD)

**Files:**
- Create: `server/utils/currency/cache.ts`
- Test: `tests/server/cache-service.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/server/cache-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CacheService } from '../../server/utils/currency/cache'

describe('CacheService', () => {
  it('devuelve el valor dentro del TTL', () => {
    let now = 1000
    const cache = new CacheService<number>(() => now)
    cache.set('k', 42, 5000)
    now = 2000
    expect(cache.get('k')).toBe(42)
  })
  it('expira el valor pasado el TTL', () => {
    let now = 1000
    const cache = new CacheService<number>(() => now)
    cache.set('k', 42, 5000)
    now = 6000 // 1000 + 5000
    expect(cache.get('k')).toBeUndefined()
  })
  it('miss para clave inexistente', () => {
    const cache = new CacheService<number>(() => 0)
    expect(cache.get('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/server/cache-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `server/utils/currency/cache.ts`**

```ts
interface Entry<T> {
  value: T
  expiresAt: number
}

// Caché genérico con TTL, desacoplado de framework. `now` inyectable para test.
export class CacheService<T> {
  private store = new Map<string, Entry<T>>()
  constructor(private now: () => number = () => Date.now()) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs })
  }
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/server/cache-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/currency/cache.ts tests/server/cache-service.test.ts
git commit -m "feat: CacheService TTL genérico"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 4: Parser defensivo + `FrankfurterProvider` (TDD)

**Files:**
- Create: `server/utils/currency/frankfurter.ts`
- Test: `tests/server/frankfurter.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/server/frankfurter.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseFrankfurterRate, FrankfurterProvider } from '../../server/utils/currency/frankfurter'

describe('parseFrankfurterRate', () => {
  it('parsea el formato plano { rate }', () => {
    const r = parseFrankfurterRate({ date: '2026-06-19', base: 'COP', quote: 'USD', rate: 0.000289 }, 'USD')
    expect(r).toEqual({ base: 'COP', quote: 'USD', rate: 0.000289, date: '2026-06-19' })
  })
  it('parsea el formato anidado { rates: { USD } }', () => {
    const r = parseFrankfurterRate({ date: '2026-06-19', base: 'COP', rates: { USD: 0.000289 } }, 'USD')
    expect(r.rate).toBe(0.000289)
    expect(r.quote).toBe('USD')
  })
  it('lanza si no hay tasa', () => {
    expect(() => parseFrankfurterRate({ date: '2026-06-19', rates: { EUR: 0.0002 } }, 'USD')).toThrow()
    expect(() => parseFrankfurterRate({}, 'USD')).toThrow()
  })
})

describe('FrankfurterProvider', () => {
  it('usa el fetcher inyectado y normaliza la respuesta', async () => {
    const provider = new FrankfurterProvider(async () => ({ date: '2026-06-19', rate: 0.00029 }))
    const r = await provider.getRate('USD')
    expect(r).toEqual({ base: 'COP', quote: 'USD', rate: 0.00029, date: '2026-06-19' })
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/server/frankfurter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `server/utils/currency/frankfurter.ts`**

```ts
import type { ExchangeRate, SupportedCurrency } from '#shared/currency/types'

export function parseFrankfurterRate(json: any, quote: SupportedCurrency): ExchangeRate {
  const date = String(json?.date || new Date().toISOString().slice(0, 10))
  let rate: unknown
  if (typeof json?.rate === 'number') {
    rate = json.rate
  } else if (json?.rates && typeof json.rates[quote] === 'number') {
    rate = json.rates[quote]
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error(`No se encontró tasa para ${quote}`)
  }
  return { base: 'COP', quote, rate, date }
}

export interface ExchangeRateProvider {
  getRate(to: SupportedCurrency): Promise<ExchangeRate>
}

type Fetcher = (url: string) => Promise<any>

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export class FrankfurterProvider implements ExchangeRateProvider {
  constructor(private fetcher: Fetcher = defaultFetcher) {}

  async getRate(to: SupportedCurrency): Promise<ExchangeRate> {
    const json = await this.fetcher(`https://api.frankfurter.dev/v2/rate/COP/${to}`)
    return parseFrankfurterRate(json, to)
  }
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/server/frankfurter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/currency/frankfurter.ts tests/server/frankfurter.test.ts
git commit -m "feat: FrankfurterProvider con parseo defensivo"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 5: `CurrencyService` cache-first (TDD)

**Files:**
- Create: `server/utils/currency/currency-service.ts`
- Test: `tests/server/currency-service.test.ts`

- [ ] **Step 1: Test que falla**

Crear `tests/server/currency-service.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { CurrencyService } from '../../server/utils/currency/currency-service'
import { CacheService } from '../../server/utils/currency/cache'
import type { ExchangeRate } from '#shared/currency/types'
import type { ExchangeRateProvider } from '../../server/utils/currency/frankfurter'

function makeProvider() {
  let calls = 0
  const provider: ExchangeRateProvider = {
    async getRate(to) {
      calls++
      return { base: 'COP', quote: to, rate: 0.00029, date: '2026-06-19' }
    },
  }
  return { provider, calls: () => calls }
}

describe('CurrencyService', () => {
  it('cache-first: 1ª llamada al provider, 2ª desde caché', async () => {
    const { provider, calls } = makeProvider()
    const svc = new CurrencyService(provider, new CacheService<ExchangeRate>(), 60000)
    const r1 = await svc.getRate('USD')
    const r2 = await svc.getRate('USD')
    expect(r1.rate).toBe(0.00029)
    expect(r2).toEqual(r1)
    expect(calls()).toBe(1)
  })
  it('COP no llama al provider y devuelve rate 1', async () => {
    const { provider, calls } = makeProvider()
    const svc = new CurrencyService(provider, new CacheService<ExchangeRate>())
    const r = await svc.getRate('COP')
    expect(r.rate).toBe(1)
    expect(r.quote).toBe('COP')
    expect(calls()).toBe(0)
  })
})
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run tests/server/currency-service.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `server/utils/currency/currency-service.ts`**

```ts
import type { CurrencyCode, ExchangeRate, SupportedCurrency } from '#shared/currency/types'
import type { CacheService } from './cache'
import type { ExchangeRateProvider } from './frankfurter'

const TTL_24H = 24 * 60 * 60 * 1000

export class CurrencyService {
  constructor(
    private provider: ExchangeRateProvider,
    private cache: CacheService<ExchangeRate>,
    private ttlMs: number = TTL_24H,
  ) {}

  async getRate(to: CurrencyCode): Promise<ExchangeRate> {
    if (to === 'COP') {
      return { base: 'COP', quote: 'COP', rate: 1, date: new Date().toISOString().slice(0, 10) }
    }
    const cached = this.cache.get(to)
    if (cached) return cached
    const rate = await this.provider.getRate(to as SupportedCurrency)
    this.cache.set(to, rate, this.ttlMs)
    return rate
  }
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run tests/server/currency-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/utils/currency/currency-service.ts tests/server/currency-service.test.ts
git commit -m "feat: CurrencyService cache-first"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 6: Singleton + endpoints Nitro

**Files:**
- Create: `server/utils/currency/service.ts`
- Create: `server/api/currency/config.get.ts`
- Create: `server/api/currency/rate.get.ts`

- [ ] **Step 1: Singleton `server/utils/currency/service.ts`**

```ts
import type { ExchangeRate } from '#shared/currency/types'
import { CacheService } from './cache'
import { FrankfurterProvider } from './frankfurter'
import { CurrencyService } from './currency-service'

let cached: CurrencyService | null = null

export function useCurrencyService(): CurrencyService {
  if (!cached) {
    cached = new CurrencyService(new FrankfurterProvider(), new CacheService<ExchangeRate>())
  }
  return cached
}
```

- [ ] **Step 2: Endpoint `server/api/currency/config.get.ts`**

```ts
import { SUPPORTED_CURRENCY_LIST } from '#shared/currency/currencies'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'

export default defineEventHandler((event) => {
  const country = getHeader(event, 'x-vercel-ip-country')
  return {
    supported: SUPPORTED_CURRENCY_LIST,
    detected: resolveCurrencyFromCountry(country),
  }
})
```

- [ ] **Step 3: Endpoint `server/api/currency/rate.get.ts`**

```ts
import { isSupportedCurrency } from '#shared/currency/currencies'
import { useCurrencyService } from '../../utils/currency/service'

export default defineEventHandler(async (event) => {
  const to = String(getQuery(event).to || '').toUpperCase()

  if (to === 'COP') {
    return { base: 'COP', quote: 'COP', rate: 1, date: new Date().toISOString().slice(0, 10) }
  }
  if (!isSupportedCurrency(to)) {
    throw createError({ statusCode: 400, statusMessage: 'Moneda no soportada' })
  }

  try {
    return await useCurrencyService().getRate(to)
  } catch (e: any) {
    console.error('[Currency] Error obteniendo tasa:', e?.message || e)
    throw createError({ statusCode: 502, statusMessage: 'No se pudo obtener la tasa de cambio' })
  }
})
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 5: Commit**

```bash
git add server/utils/currency/service.ts server/api/currency
git commit -m "feat: endpoints Nitro de divisas (config + rate)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 7: Composable + componentes + página demo

**Files:**
- Create: `app/composables/useCurrencyConverter.ts`
- Create: `app/components/currency/CurrencySelector.vue`
- Create: `app/components/currency/ConversionResult.vue`
- Create: `app/pages/tools/conversor.vue`

- [ ] **Step 1: Composable `app/composables/useCurrencyConverter.ts`**

```ts
import type { Currency, CurrencyCode, ExchangeRate } from '#shared/currency/types'
import { convert } from '#shared/currency/conversion'
import { DEFAULT_CURRENCY } from '#shared/currency/currencies'

export function useCurrencyConverter(initialCurrency?: CurrencyCode) {
  const amountCop = ref<number>(100000)
  const targetCurrency = ref<CurrencyCode>(initialCurrency || DEFAULT_CURRENCY)
  const rate = ref<number | null>(null)
  const rateDate = ref<string>('')
  const result = ref<number | null>(null)
  const loading = ref(false)
  const error = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastCurrency: CurrencyCode | null = null

  const compute = () => {
    if (rate.value != null && Number.isFinite(amountCop.value) && amountCop.value >= 0) {
      result.value = convert(amountCop.value, rate.value)
    } else {
      result.value = null
    }
  }

  const fetchRate = async () => {
    const to = targetCurrency.value
    // Reusar la tasa si la moneda no cambió.
    if (to === lastCurrency && rate.value != null) {
      compute()
      return
    }
    // COP->COP no llama API.
    if (to === 'COP') {
      rate.value = 1
      rateDate.value = new Date().toISOString().slice(0, 10)
      lastCurrency = to
      error.value = false
      compute()
      return
    }
    loading.value = true
    error.value = false
    try {
      const data = await $fetch<ExchangeRate>('/api/currency/rate', { query: { to } })
      rate.value = data.rate
      rateDate.value = data.date
      lastCurrency = to
      compute()
    } catch {
      error.value = true
      rate.value = null
      result.value = null
    } finally {
      loading.value = false
    }
  }

  const scheduleConversion = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchRate, 400)
  }

  watch(amountCop, () => { compute(); scheduleConversion() })
  watch(targetCurrency, () => { scheduleConversion() })

  onMounted(fetchRate)

  return { amountCop, targetCurrency, rate, rateDate, result, loading, error }
}
```

- [ ] **Step 2: `app/components/currency/CurrencySelector.vue`**

```vue
<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    class="rounded-xl border border-border bg-[var(--bg2)] px-3 py-2.5 text-sm font-medium text-text focus:border-amber focus:outline-none"
  >
    <option v-for="c in options" :key="c.code" :value="c.code">
      {{ c.symbol }} {{ c.code }} — {{ c.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import type { Currency } from '#shared/currency/types'

defineProps<{ modelValue: string; options: Currency[] }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
```

- [ ] **Step 3: `app/components/currency/ConversionResult.vue`**

```vue
<template>
  <div class="rounded-xl border border-border bg-[var(--bg2)] p-4">
    <div v-if="loading" class="flex items-center gap-2 text-text-dim text-sm">
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber/40 border-t-amber"></span>
      Calculando...
    </div>
    <div v-else-if="error" class="text-sm text-red font-medium">
      No se pudo obtener la tasa. Intenta de nuevo más tarde.
    </div>
    <div v-else-if="result != null">
      <div class="text-3xl font-bold text-text">
        {{ symbol }}{{ result.toLocaleString('es-CO', { maximumFractionDigits: 2 }) }}
        <span class="text-base font-mono text-text-dim">{{ currency }}</span>
      </div>
      <div v-if="rateDate" class="mt-1 text-[11px] font-mono text-text-dim">
        Tasa del {{ rateDate }}
      </div>
    </div>
    <div v-else class="text-sm text-text-dim">Ingresa una cantidad para convertir.</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  result: number | null
  symbol: string
  currency: string
  rateDate: string
  loading: boolean
  error: boolean
}>()
</script>
```

- [ ] **Step 4: Página demo `app/pages/tools/conversor.vue`**

```vue
<template>
  <div class="min-h-dvh bg-[var(--bg)] flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border border-border bg-[var(--bg2)] p-6 sm:p-8">
      <h1 class="font-head text-2xl font-bold text-text mb-1">Conversor de divisas</h1>
      <p class="text-[12px] font-mono text-text-dim mb-6">Desde Pesos Colombianos (COP)</p>

      <label class="block text-xs font-semibold text-text-dim mb-2">Cantidad en COP</label>
      <input
        v-model.number="amountCop"
        type="number"
        min="0"
        class="w-full rounded-xl border border-border bg-[var(--bg)] px-3 py-2.5 text-sm text-text focus:border-amber focus:outline-none mb-4"
      />

      <label class="block text-xs font-semibold text-text-dim mb-2">Convertir a</label>
      <CurrencySelector v-model="targetCurrency" :options="supported" class="w-full mb-5" />

      <ConversionResult
        :result="result"
        :symbol="symbol"
        :currency="targetCurrency"
        :rate-date="rateDate"
        :loading="loading"
        :error="error"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SUPPORTED_CURRENCIES, SUPPORTED_CURRENCY_LIST, DEFAULT_CURRENCY } from '#shared/currency/currencies'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'
import type { CurrencyCode } from '#shared/currency/types'

// Preselección por país (SSR, header de Vercel) con fallback a USD.
const headers = useRequestHeaders(['x-vercel-ip-country'])
const detected = resolveCurrencyFromCountry(headers['x-vercel-ip-country'])
const initial: CurrencyCode = detected || DEFAULT_CURRENCY

const supported = SUPPORTED_CURRENCY_LIST
const { amountCop, targetCurrency, result, rateDate, loading, error } = useCurrencyConverter(initial)

const symbol = computed(() => {
  const code = targetCurrency.value
  return code === 'COP' ? '$' : (SUPPORTED_CURRENCIES[code]?.symbol || '')
})

useSeoMeta({ title: 'Conversor de divisas | BringJobs' })
</script>
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/composables/useCurrencyConverter.ts app/components/currency app/pages/tools/conversor.vue
git commit -m "feat: widget conversor de divisas (composable + componentes + página)"
```
(Terminar mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 8: Verificación final

**Files:** ninguno.

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos verdes (incluye conversion, cache-service, frankfurter, currency-service, country-currency).

- [ ] **Step 2: Verificar el endpoint de tasa real (dev)**

Con `npm run dev`:
```bash
curl -s "http://localhost:3000/api/currency/rate?to=USD"
```
Expected: JSON `{ "base":"COP","quote":"USD","rate":<num>,"date":"..." }`.

- [ ] **Step 3: Verificar la página**

Abrir `http://localhost:3000/tools/conversor` → ingresar 100000, elegir USD → muestra el resultado convertido y la fecha de la tasa. Cambiar a COP→ no llama API (resultado = cantidad). Probar moneda no soportada vía curl `?to=JPY` → 400.

---

## Notas de cierre

- Dominio puro en `shared/currency/` reutilizable por client y server (alias `#shared`).
- `ExchangeRateProvider` permite cambiar/añadir proveedor sin tocar `CurrencyService`.
- Agregar moneda = 1 entrada en `currencies.ts` (+ opcional país en `country-currency.ts`).
- Caché 24h por instancia caliente; `CacheService` es swappable por un store persistente.
- Detección de país por header de Vercel en SSR, con fallback a USD (esperado, no error).
