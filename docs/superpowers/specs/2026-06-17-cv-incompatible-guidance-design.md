# Diseño: Guía cuando el CV es incompatible (sin texto extraíble)

**Fecha:** 2026-06-17
**Rama:** `feature/google-login` (continúa la sesión actual)
**Alcance:** App web — flujo logueado (`/import-cv`) y flujo trial anónimo (`/free-trial`).

## Objetivo

Cuando un usuario sube un CV del que no se puede extraer texto (PDF basado en
imagen / escaneado), explicarle de forma clara que ese formato **no es admitido por
nuestro sistema ni por la mayoría de los ATS**, y ofrecerle un camino para **crear un
CV compatible desde cero** dentro del producto.

## Contexto actual

Ambos endpoints de importación ya **detectan** el caso y lanzan un `422`:
- `server/api/import.post.ts` (logueado, usado por `/import-cv`).
- `server/api/trial/import.post.ts` (anónimo, usado por `/free-trial`).

Casos que producen el 422 "ilegible":
1. Error al parsear el PDF (`extractText` lanza) → 422 "Solo se admiten PDFs con
   texto seleccionable."
2. Texto insuficiente (`text.trim().length < 10`) → 422 "...no procesa PDFs
   escaneados o basados en imagen."

**Problema:** el frontend no distingue ese 422 de otros fallos. Hoy:
- `app/pages/import-cv.vue` → en cualquier error muestra `toast.error(t('importar_cv.toast_error'))`.
- `app/pages/free-trial.vue` → maneja `403` (cuota) y para el resto muestra
  `toast.error(t('free_trial.toast_error'))`.

Dato relevante a preservar: en `trial/import.post.ts` el chequeo de texto (línea
~127) ocurre **antes** de la consulta que marca `import_used = 1` (línea ~134), así
que un CV ilegible **no consume** el import gratuito. El diseño no cambia ese orden.

## Decisiones de diseño aprobadas

- **Detección:** marcar los dos `createError(422)` con un código estructurado
  `CV_NOT_READABLE` (vía `data`), para distinguirlos de forma fiable. No detectar
  solo por `statusCode`.
- **Presentación:** pantalla inline que reemplaza el área de subida (mismo patrón que
  la pantalla de `auditResult`), no un modal ni un toast.
- **CTA principal "Crear mi CV desde cero":**
  - `/import-cv` (logueado) → `navigateTo('/profile')`.
  - `/free-trial` (anónimo) → `navigateTo('/signup')`.
- **Enlace secundario sutil "elegir otro archivo"** que resetea el estado de rechazo
  (evita un callejón sin salida; no es un botón de reintento prominente).
- Los demás errores (500, archivo muy grande, 403 de cuota) **mantienen** su manejo
  actual (toast / lógica existente).

## Arquitectura

### 1. Backend — helper compartido + código de error

Nuevo `server/utils/cv-import.ts`:
```ts
export const CV_NOT_READABLE = 'CV_NOT_READABLE'

export function cvNotReadableError(message: string) {
  return createError({
    statusCode: 422,
    message,
    data: { code: CV_NOT_READABLE },
  })
}
```

`import.post.ts` y `trial/import.post.ts`: reemplazar los dos `createError(422)`
(PDF ilegible + texto insuficiente) por `throw cvNotReadableError(<mismo mensaje>)`.
El resto de errores (400 tamaño, 403 cuota, 500 IA) no cambian.

### 2. Frontend — detección testeable

Nuevo `app/utils/import-errors.ts`. El frontend **no** importa código de servidor;
usa el literal `'CV_NOT_READABLE'` directamente (el código es un contrato simple
entre back y front):
```ts
export function isCvNotReadable(err: any): boolean {
  // Nitro serializa createError; el `data` custom puede quedar bajo
  // err.data.data o err.data según la versión -> se contemplan ambas.
  const code = err?.data?.data?.code ?? err?.data?.code
  return code === 'CV_NOT_READABLE'
}
```
Nota de implementación: la forma exacta del error de `$fetch`/Nitro se verifica con
un log puntual durante la implementación; el test cubre ambas formas.

### 3. Frontend — pantalla de rechazo (inline)

En `import-cv.vue` y `free-trial.vue`:
- Nuevo estado `cvRejected = ref(false)`.
- En el `catch` del import: `if (isCvNotReadable(e)) { cvRejected.value = true; return }`
  antes del `toast.error` genérico.
- Nueva sección `v-if="cvRejected"` (estilo card como `auditResult`):
  - Ícono de alerta (`material-symbols-outlined` p.ej. `report` / `description_off`).
  - Título: `t('...cv_rejected_title')`.
  - Descripción: `t('...cv_rejected_desc')` (PDF imagen/escaneado, ilegible para
    nuestro sistema y los ATS, sería descartado).
  - `AppButton` primario → `goCreateFromScratch()`:
    - import-cv: `navigateTo('/profile')`.
    - free-trial: `navigateTo('/signup')`.
  - Enlace sutil → `resetRejection()` (`cvRejected = false`, `selectedFile = null`).

### 4. i18n

Nuevas claves (es + en):
- En `importar_cv`: `cv_rejected_title`, `cv_rejected_desc`, `cv_rejected_cta`,
  `cv_rejected_retry`.
- En `free_trial`: `cv_rejected_title`, `cv_rejected_desc`, `cv_rejected_cta`,
  `cv_rejected_retry`.

## Flujo de datos

```
Usuario sube PDF imagen
  → POST /api/import (o /api/trial/import)
  → backend extrae texto = '' (o parse falla)
  → throw cvNotReadableError(...)  [422, data.code=CV_NOT_READABLE]
  → frontend catch: isCvNotReadable(e) === true
  → cvRejected = true → pantalla de rechazo
  → CTA → /profile (logueado) ó /signup (trial)
```

## Manejo de errores

- Solo `CV_NOT_READABLE` dispara la pantalla de rechazo.
- 500 / 400 / 403 → comportamiento actual (toast genérico, o lógica de cuota en
  trial). Sin cambios.
- Trial: el rechazo no consume el import gratuito (orden de chequeos preservado).

## Estrategia de pruebas

**Unit (vitest):**
- `cvNotReadableError('x')` → objeto con `statusCode === 422` y
  `data.code === 'CV_NOT_READABLE'`.
- `isCvNotReadable(err)` → `true` para la forma de error de Nitro con el código;
  `false` para 500/403/otros.

**Manual:**
- Subir un PDF basado en imagen en `/import-cv` → pantalla de rechazo, CTA va a
  `/profile`.
- Subir el mismo PDF en `/free-trial` → pantalla de rechazo, CTA va a `/signup`, y
  el import gratuito **no** se consume.
- Subir un PDF con texto seleccionable → sigue importando normal.

## Fuera de alcance

- OCR / extracción de texto desde imágenes.
- Validación de otros formatos exóticos (docx, etc.).
- Cambios al endpoint de extracción más allá del código de error.
