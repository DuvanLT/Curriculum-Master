# Diseño: Códigos de descuento / afiliados con BOLD

**Fecha:** 2026-06-18
**Rama:** `marketing-seo` (sesión actual)
**Alcance:** App web — flujo de checkout/pago con BOLD.

## Objetivo

Permitir que distintos vendedores tengan un **código de descuento**; cuando un
comprador lo usa, obtiene un % de descuento sobre el precio (32.500 COP) y la venta
queda **atribuida** a ese código. El dueño consulta directamente en la DB cuántas
ventas y cuánto total generó cada vendedor (la comisión la calcula por fuera).

## Contexto actual (BOLD)

- `UpgradeModal.vue` → `POST /api/checkout/payment` (sin body) → crea un Payment Link
  de BOLD con monto **fijo 32500 COP**, `reference = "${userId}-${Date.now()}"`,
  `callback_url` al dashboard → devuelve `url` → redirige.
- Confirmación por **dos vías**, ambas suben a `pro` e insertan en `orders`:
  1. `server/api/webhooks/payment.post.ts` (principal, HMAC) — evento `SALE_APPROVED`.
  2. `server/api/checkout/status.get.ts` (fallback al volver del pago).
- `orders` ya guarda `total` = monto realmente cobrado (el descontado).
- `runtimeConfig.boldPaymentAmount` existe (env `NUXT_BOLD_PAYMENT_AMOUNT=32500`) pero
  **no se usa**; el monto está hardcodeado como `32500` en dos archivos.

**Hecho clave:** BOLD **no** tiene cupones nativos. El descuento se logra enviando un
`total_amount` menor al crear el link.

## Decisiones de diseño aprobadas

- **Descuento:** porcentaje configurable **por código**.
- **Comisión:** el sistema NO la calcula; solo se registra la atribución (código en la
  orden). El reporte (ventas + total por código) se consulta directo en la DB.
- **Administración:** los códigos se insertan **manualmente** en la DB (sin UI/endpoints
  de admin).
- **Validez del código — UX principal:** el modal valida el código **en tiempo real** al
  presionar "Aplicar" (vía `validate-code`). Si es inválido, se muestra el error **ahí
  mismo en el modal**, antes de iniciar cualquier pago — la persona nunca es enviada a
  BOLD con un código malo ni se entera al final. El bloqueo 400 en el checkout es solo
  una red de seguridad de backend (defensa en profundidad).
- **Puente referencia→código:** tabla `checkout_sessions` keyed por `reference` (no
  codificar el código en el `reference`; el `userId` ya contiene guiones).

## Arquitectura

### 1. Esquema (migración en `server/utils/db.ts`)

Tabla `discount_codes` (la llena el dueño manualmente):
```sql
CREATE TABLE IF NOT EXISTS discount_codes (
  code TEXT PRIMARY KEY,
  seller_name TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,   -- 1..100
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Tabla `checkout_sessions` (la escribe el sistema al iniciar el pago):
```sql
CREATE TABLE IF NOT EXISTS checkout_sessions (
  reference TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  discount_code TEXT,
  amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Columna nueva en `orders` (vía el patrón ALTER idempotente existente):
`discount_code TEXT`.

### 2. Precio base + cálculo de descuento (util compartido)

Nuevo `server/utils/pricing.ts`:
```ts
export function getBasePrice(config: { boldPaymentAmount?: string | number }): number {
  const n = Number(config.boldPaymentAmount)
  return Number.isFinite(n) && n > 0 ? n : 32500
}

// Aplica % de descuento al precio base; redondea a entero COP. Nunca < 0.
export function applyDiscount(base: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100)
  return Math.max(0, base - Math.round(base * pct / 100))
}
```
Función pura → tests unitarios.

### 3. Validación de código (util + endpoint) — feedback inmediato en el modal

`server/utils/discount.ts`:
```ts
export interface ValidatedDiscount {
  code: string
  seller_name: string
  discount_percent: number
  final_amount: number
}
// Busca el código activo; si no existe/!active -> null.
export async function lookupActiveDiscount(db, code, basePrice): Promise<ValidatedDiscount | null>
```

Endpoint `POST /api/checkout/validate-code` (sesión verificada):
- Body `{ code }`. Normaliza (trim + UPPERCASE).
- `lookupActiveDiscount` → si null: `{ valid: false }`. Si ok:
  `{ valid: true, seller_name, discount_percent, final_amount }`.
- Este endpoint es lo que permite que el modal avise "código inválido" sin que la
  persona inicie el pago.

### 4. Checkout con descuento (`checkout/payment.post.ts`)

- Leer `code` opcional del body (trim + UPPERCASE).
- `basePrice = getBasePrice(config)`.
- Si hay `code`: `lookupActiveDiscount`; si null → `createError(400, 'Código inválido')`
  (red de seguridad; en la práctica el modal ya validó). Si ok → `amount = final_amount`,
  `appliedCode = code`. Sin código → `amount = basePrice`, `appliedCode = null`.
- Crear link BOLD con `total_amount: amount`.
- `INSERT INTO checkout_sessions (reference, user_id, discount_code, amount)`.
- Devolver `{ url, reference }` (igual que hoy).

### 5. Atribución al confirmar (en AMBAS vías)

Util `server/utils/discount.ts` → `getCheckoutDiscountCode(db, reference): Promise<string | null>`
(lee `checkout_sessions.discount_code`).

- `webhooks/payment.post.ts` (SALE_APPROVED): antes del INSERT en `orders`, obtener
  `discountCode = await getCheckoutDiscountCode(db, reference)` e incluirlo en el INSERT.
- `checkout/status.get.ts` (PAID/APPROVED fallback): igual, incluir `discount_code` en
  su INSERT.

(El INSERT de `orders` añade la columna `discount_code` en ambos sitios. Los casos
REJECTED/VOID pueden dejar `discount_code = null`; solo importa la atribución de ventas
aprobadas.)

### 6. Frontend (`UpgradeModal.vue` + i18n)

- Campo de texto "¿Tienes un código de descuento?" + botón "Aplicar".
- Aplicar → `POST /api/checkout/validate-code`:
  - Válido → mostrar "Código {code} de {seller}: {pct}% — nuevo precio ${final}" y
    recordar el código aplicado.
  - Inválido → mensaje de error **inline en el modal** ("Código inválido o inactivo");
    el botón de pago no usa ese código.
- `handleUpgrade` envía `{ code }` (solo si fue validado) al checkout.
- Strings i18n nuevos (es + en).

### 7. Reporte (consulta directa en DB)

No se construye UI. Consulta de referencia:
```sql
SELECT d.code, d.seller_name, COUNT(*) AS ventas, SUM(o.total) AS total_recaudado
FROM orders o
JOIN discount_codes d ON o.discount_code = d.code
WHERE o.status = 'APPROVED'
GROUP BY d.code, d.seller_name
ORDER BY ventas DESC;
```

### 8. Seed de prueba

Al finalizar, insertar un código de prueba:
`INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES ('CODTE', 'Prueba', 15, 1)`.

## Flujo de datos

```
Comprador abre UpgradeModal → escribe CODTE → Aplicar
  → POST /api/checkout/validate-code → {valid, 15%, final 27625}   (o {valid:false} -> error en modal)
  → Pagar → POST /api/checkout/payment { code: 'CODTE' }
     → amount = 27625; crea link BOLD; INSERT checkout_sessions(ref, user, 'CODTE', 27625)
  → paga en BOLD → webhook SALE_APPROVED
     → getCheckoutDiscountCode(ref) = 'CODTE'
     → INSERT orders(..., total=27625, discount_code='CODTE')
  → dueño consulta DB: ventas por código
```

## Manejo de errores

- Código inválido/inactivo en el modal (`validate-code`) → `{ valid: false }` → mensaje
  inline; no se inicia pago.
- Código inválido en checkout (red de seguridad) → 400.
- Si no hay `checkout_sessions` para una referencia (caso legado) →
  `getCheckoutDiscountCode` devuelve `null`; la orden se guarda sin código (no rompe).
- BOLD COP: montos enteros (sin decimales); `applyDiscount` redondea.

## Estrategia de pruebas

**Unit (vitest):**
- `getBasePrice`: usa config; fallback 32500.
- `applyDiscount`: 10%→29250, 15%→27625, 0%→32500, redondeo correcto, nunca negativo.
- `lookupActiveDiscount` / `getCheckoutDiscountCode` con DB libsql en memoria:
  código activo → datos + final_amount; inactivo/inexistente → null; referencia con/sin
  sesión.

**Manual (modo test BOLD):**
- Insertar CODTE; en el modal aplicar CODTE → muestra 15% y nuevo precio; aplicar un
  código inexistente → mensaje de error inline sin iniciar pago.
- Completar pago de prueba → verificar `checkout_sessions` y `orders.discount_code='CODTE'`.

## Fuera de alcance

- UI/endpoints de administración de códigos y de reporte (se gestiona en la DB).
- Cálculo automático de comisiones.
- Límite de usos por código, expiración, o un código por usuario.
