# Diseño: Módulo de conversión de divisas (COP → X)

**Fecha:** 2026-06-18
**Rama:** `marketing-seo`
**Stack:** Nuxt 4 (Vue) + Nitro, desplegado en Vercel. Moneda base: **COP**.

## Objetivo

Widget reutilizable + servicios backend para convertir una cantidad en COP a una
moneda destino, con preselección automática según el país del visitante (header de
Vercel) y fallback manual. Default visible sin detección: **USD**.

## Decisiones aprobadas

- Adaptar el spec (escrito en términos Next.js/React) al stack real **Nuxt/Vue+Nitro**.
- Entregar **componente reutilizable + servicios + página demo** (`/tools/conversor`).
- Default sin detección: **USD**.
- Sin diagramas (ir directo a implementación). Arquitectura descrita abajo en texto.

## Detección de país

- Vercel inyecta `X-Vercel-IP-Country`. Se lee **server-side** en SSR vía
  `useRequestHeaders(['x-vercel-ip-country'])` (equivalente Nuxt a Server Component).
- Se mapea SOLO contra divisas soportadas (no contra ~190 países).
- Header ausente o país no soportado → **sin preselección**; cae a default visible (USD)
  y el usuario elige. Es comportamiento esperado, no error.

## API de tasas

`https://api.frankfurter.dev/v2/rate/COP/{TO}` → `{ date, base, quote, rate }`.
**Parseo defensivo:** aceptar también `rates: { "USD": 0.000289 }` y normalizar al
contrato interno `{ base, quote, rate, date }`.

## Arquitectura (dependencias hacia el dominio)

```
UI Vue → composable → Nitro API → Services → Domain (puro)
```

### Dominio — `server/utils/currency/` (puro, sin HTTP/caché/Vue)
- `types.ts`: `Currency {code,symbol,name}`, `ExchangeRate {base,quote,rate,date}`,
  `ConversionResult {amountCOP,currency,rate,result,date}`,
  `SupportedCurrency = 'USD'|'EUR'|'MXN'|'GBP'|'BRL'|'PEN'|'CLP'`.
- `currencies.ts`: tabla de config de divisas soportadas (símbolo + nombre).
  Agregar moneda = 1 entrada.
- `country-currency.ts`: mapa país→divisa (solo soportadas, p.ej. US→USD, MX→MXN,
  GB→GBP, BR→BRL, PE→PEN, CL→CLP, y Eurozona→EUR). Agregar país = 1 entrada.
  `resolveCurrencyFromCountry(country?): SupportedCurrency | null` (puro).

### Servicios
- `ConversionService` (puro): `convert(amountCOP, rate): number` = `amountCOP * rate`;
  valida monto finito ≥ 0 (lanza en inválido). Sin HTTP ni caché.
- `CacheService<T>` (puro, TTL genérico): `get(key)`, `set(key, value, ttlMs)`; expira por
  tiempo. Inyecta `now()` para testear el TTL. Desacoplado de framework.
- `ExchangeRateProvider` (interfaz): `getRate(to): Promise<ExchangeRate>`.
  - `FrankfurterProvider` (impl): llama la API; parseo defensivo (`rate` plano o
    `rates{}`); lanza si no hay tasa.
- `CurrencyService` (cache-first): `getRate(to): Promise<ExchangeRate>`.
  - `to === 'COP'` → `{ rate: 1 }` **sin** llamar API.
  - Cache-first con TTL 24h; miss → provider → cachea. Reusa tasa cacheada para la misma
    moneda. Recibe `CacheService` y `ExchangeRateProvider` por inyección.

### API (Nitro, `server/api/currency/`)
- `GET /api/currency/config` → `{ supported: Currency[], detected: SupportedCurrency | null }`
  (lee el header server-side y resuelve la divisa o null).
- `GET /api/currency/rate?to=USD` → `ExchangeRate`. Valida `to` soportado (400 si no).
  Usa `CurrencyService` (cache-first). COP no requiere API.

### Frontend (`app/`)
- `composables/useCurrencyConverter.ts`: estado (`amountCop`, `targetCurrency`, `result`,
  `loading`, `error`, `rate`, `rateDate`). Conversión **con debounce** (~400ms). Reusa la
  tasa si la moneda no cambió. COP→COP sin API. Si la API falla → `error` (UI no se rompe).
- `components/currency/CurrencySelector.vue`: dropdown de divisas soportadas (símbolo+code).
- `components/currency/ConversionResult.vue`: muestra resultado, símbolo, **fecha de la
  tasa**, estados de loading/error.
- `pages/tools/conversor.vue`: arma el widget; **preselección por IP** vía SSR
  (`useRequestHeaders` → `resolveCurrencyFromCountry`), fallback a USD.

## Rendimiento

- Tasas cacheadas 24h (CacheService). Caveat serverless: la caché en memoria vive por
  instancia "caliente"; la interfaz permite cambiarla por un store persistente luego sin
  tocar `CurrencyService`. La API frankfurter es gratuita y diaria, así que es aceptable.
- Reusar tasa para la misma moneda destino. COP→COP no llama API.

## Manejo de errores

- API de tasas caída → endpoint devuelve 502/error controlado; el composable setea
  `error` y la UI muestra estado de error sin romperse.
- `to` no soportado → 400.
- Monto inválido (NaN/negativo) → no convierte; muestra 0/limpio.

## Pruebas (vitest)

- `ConversionService`: fórmula (100000×0.000289=28.9), redondeo, validación (negativo/NaN).
- `CacheService`: hit dentro de TTL, miss tras expirar (now() inyectado), set/get.
- `CurrencyService`: cache-first (1ª llamada al provider, 2ª desde caché), COP→COP sin
  provider, reuso por misma moneda.
- `FrankfurterProvider`: parseo `rate` plano, `rates{USD}`, y faltante (lanza).
- `resolveCurrencyFromCountry`: header ausente → null, país no soportado → null,
  soportado → divisa correcta.

## Escalabilidad

- Nueva moneda: 1 entrada en `currencies.ts` (+ opcional en `country-currency.ts`).
- Nuevo proveedor de tasas: nueva impl de `ExchangeRateProvider`; `CurrencyService`/
  `ConversionService` intactos.
- Nuevos países: entradas en `country-currency.ts`; resto intacto.

## Fuera de alcance

- Persistencia de caché en Redis/KV (la interfaz lo permite a futuro).
- Conversión inversa (X→COP) y multi-base.
- Integrar el conversor al pricing/UpgradeModal (queda como componente reutilizable).
