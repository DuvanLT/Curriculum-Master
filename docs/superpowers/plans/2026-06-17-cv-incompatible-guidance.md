# Guía para CV incompatible — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un CV no tiene texto extraíble (PDF imagen/escaneado), mostrar una pantalla que explique que el formato no es admitido (ni por los ATS) y guiar al usuario a crear un CV compatible desde cero.

**Architecture:** El backend ya detecta el caso (422); se le añade un código estructurado `CV_NOT_READABLE` vía un helper compartido. El frontend detecta ese código con un util puro testeable y muestra una pantalla de rechazo inline (en `/import-cv` y `/free-trial`) con CTA a `/profile` (logueado) o `/signup` (trial). Lógica pura por TDD; pantallas por verificación manual.

**Tech Stack:** Nuxt 4, Nitro/h3, vitest, vue 3.

**Spec:** `docs/superpowers/specs/2026-06-17-cv-incompatible-guidance-design.md`

---

## File Structure

- `server/utils/cv-import.ts` — **Crear**. `CV_NOT_READABLE` + `cvNotReadableError(message)`.
- `server/api/import.post.ts` — **Modificar**. Usar el helper en los dos 422.
- `server/api/trial/import.post.ts` — **Modificar**. Usar el helper en los dos 422.
- `app/utils/import-errors.ts` — **Crear**. `isCvNotReadable(err)`.
- `app/pages/import-cv.vue` — **Modificar**. Estado + pantalla de rechazo + CTA `/profile`.
- `app/pages/free-trial.vue` — **Modificar**. Estado + pantalla de rechazo + CTA `/signup`.
- `i18n/locales/es.json` / `en.json` — **Modificar**. Claves nuevas.
- `tests/server/cv-import.test.ts` — **Crear**.
- `tests/app/import-errors.test.ts` — **Crear**.

---

## Task 1: Helper de error en backend (`cvNotReadableError`)

**Files:**
- Create: `server/utils/cv-import.ts`
- Test: `tests/server/cv-import.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/server/cv-import.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { cvNotReadableError, CV_NOT_READABLE } from '../../server/utils/cv-import'

describe('cvNotReadableError', () => {
  it('produce un error 422 con el código CV_NOT_READABLE', () => {
    const err: any = cvNotReadableError('PDF ilegible')
    expect(err.statusCode).toBe(422)
    expect(err.message).toBe('PDF ilegible')
    expect(err.data).toEqual({ code: CV_NOT_READABLE })
  })

  it('exporta la constante con el valor de contrato', () => {
    expect(CV_NOT_READABLE).toBe('CV_NOT_READABLE')
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/server/cv-import.test.ts`
Expected: FAIL — módulo `cv-import` no existe.

- [ ] **Step 3: Implementar el helper**

Crear `server/utils/cv-import.ts`:

```ts
import { createError } from 'h3'

export const CV_NOT_READABLE = 'CV_NOT_READABLE'

export function cvNotReadableError(message: string) {
  return createError({
    statusCode: 422,
    message,
    data: { code: CV_NOT_READABLE },
  })
}
```

Nota: se importa `createError` desde `'h3'` explícitamente para que el test (fuera
del runtime de Nitro) lo resuelva; en el servidor funciona igual.

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/server/cv-import.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/utils/cv-import.ts tests/server/cv-import.test.ts
git commit -m "feat: helper cvNotReadableError con código de contrato"
```

---

## Task 2: Usar el helper en los endpoints de importación

**Files:**
- Modify: `server/api/import.post.ts`
- Modify: `server/api/trial/import.post.ts`

- [ ] **Step 1: Importar el helper en `import.post.ts`**

En `server/api/import.post.ts`, tras la línea `import { checkUserAIRateLimit } from '../utils/rate-limit'` (línea 4), añadir:
```ts
import { cvNotReadableError } from '../utils/cv-import'
```

- [ ] **Step 2: Reemplazar el 422 de parseo de PDF en `import.post.ts`**

Reemplazar este bloque (líneas ~101-107):
```ts
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw createError({
          statusCode: 422,
          message: `No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`
        })
      }
```
por:
```ts
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw cvNotReadableError(`No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`)
      }
```

- [ ] **Step 3: Reemplazar el 422 de texto insuficiente en `import.post.ts`**

Reemplazar (líneas ~121-126):
```ts
  if (!text || text.trim().length < 10) {
    throw createError({
      statusCode: 422,
      message: 'No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.'
    })
  }
```
por:
```ts
  if (!text || text.trim().length < 10) {
    throw cvNotReadableError('No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.')
  }
```

- [ ] **Step 4: Importar el helper en `trial/import.post.ts`**

En `server/api/trial/import.post.ts`, tras `import { checkAnonAIRateLimit } from '../../utils/rate-limit'` (línea 4), añadir:
```ts
import { cvNotReadableError } from '../../utils/cv-import'
```

- [ ] **Step 5: Reemplazar el 422 de parseo de PDF en `trial/import.post.ts`**

Reemplazar (líneas ~107-113):
```ts
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw createError({
          statusCode: 422,
          message: `No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`
        })
      }
```
por:
```ts
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw cvNotReadableError(`No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`)
      }
```

- [ ] **Step 6: Reemplazar el 422 de texto insuficiente en `trial/import.post.ts`**

Reemplazar (líneas ~127-132):
```ts
  if (!text || text.trim().length < 10) {
    throw createError({
      statusCode: 422,
      message: 'No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.'
    })
  }
```
por:
```ts
  if (!text || text.trim().length < 10) {
    throw cvNotReadableError('No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.')
  }
```

Nota: el orden no cambia — el rechazo en trial sigue ocurriendo antes del `INSERT`
que marca `import_used = 1`, así que no se consume el import gratuito.

- [ ] **Step 7: Verificar build**

Run: `npm run build`
Expected: build completo sin errores.

- [ ] **Step 8: Commit**

```bash
git add server/api/import.post.ts server/api/trial/import.post.ts
git commit -m "feat: marcar errores de CV ilegible con CV_NOT_READABLE"
```

---

## Task 3: Util de detección en frontend (`isCvNotReadable`)

**Files:**
- Create: `app/utils/import-errors.ts`
- Test: `tests/app/import-errors.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/app/import-errors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isCvNotReadable } from '../../app/utils/import-errors'

describe('isCvNotReadable', () => {
  it('true cuando el código está bajo err.data.data.code (forma Nitro)', () => {
    const err = { statusCode: 422, data: { statusCode: 422, message: 'x', data: { code: 'CV_NOT_READABLE' } } }
    expect(isCvNotReadable(err)).toBe(true)
  })

  it('true cuando el código está bajo err.data.code (forma alterna)', () => {
    const err = { statusCode: 422, data: { code: 'CV_NOT_READABLE' } }
    expect(isCvNotReadable(err)).toBe(true)
  })

  it('false para otros errores', () => {
    expect(isCvNotReadable({ statusCode: 500, data: { message: 'boom' } })).toBe(false)
    expect(isCvNotReadable({ statusCode: 403, data: { code: 'QUOTA' } })).toBe(false)
    expect(isCvNotReadable(null)).toBe(false)
    expect(isCvNotReadable(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/app/import-errors.test.ts`
Expected: FAIL — módulo `import-errors` no existe.

- [ ] **Step 3: Implementar el util**

Crear `app/utils/import-errors.ts`:

```ts
// Código de contrato compartido con el backend (server/utils/cv-import.ts).
// El frontend no importa código de servidor; usa el literal directamente.
export function isCvNotReadable(err: any): boolean {
  if (!err) return false
  const code = err?.data?.data?.code ?? err?.data?.code
  return code === 'CV_NOT_READABLE'
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/app/import-errors.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/utils/import-errors.ts tests/app/import-errors.test.ts
git commit -m "feat: util isCvNotReadable para detectar CV ilegible"
```

---

## Task 4: i18n — claves de la pantalla de rechazo

**Files:**
- Modify: `i18n/locales/es.json`
- Modify: `i18n/locales/en.json`

- [ ] **Step 1: Añadir claves en `importar_cv` (es)**

En `i18n/locales/es.json`, localizar la clave `"importar_cv": {` y añadir, justo
después de la llave de apertura, estas líneas:
```json
    "cv_rejected_title": "No pudimos leer tu CV",
    "cv_rejected_desc": "Tu archivo parece un PDF basado en imagen o escaneado, sin texto seleccionable. Nuestro sistema —y la mayoría de los filtros automáticos (ATS) que usan los reclutadores— no pueden leerlo, así que sería descartado. Te ayudamos a crear uno que sí funcione.",
    "cv_rejected_cta": "Crear mi CV desde cero",
    "cv_rejected_retry": "Elegir otro archivo",
```

- [ ] **Step 2: Añadir claves en `importar_cv` (en)**

En `i18n/locales/en.json`, dentro de `"importar_cv": {`, añadir tras la apertura:
```json
    "cv_rejected_title": "We couldn't read your CV",
    "cv_rejected_desc": "Your file looks like an image-based or scanned PDF with no selectable text. Our system —and most of the automated filters (ATS) recruiters use— can't read it, so it would be discarded. Let's create one that actually works.",
    "cv_rejected_cta": "Build my CV from scratch",
    "cv_rejected_retry": "Choose another file",
```

- [ ] **Step 3: Añadir claves en `free_trial` (es)**

En `i18n/locales/es.json`, dentro de `"free_trial": {`, añadir tras la apertura:
```json
    "cv_rejected_title": "No pudimos leer tu CV",
    "cv_rejected_desc": "Tu archivo parece un PDF basado en imagen o escaneado, sin texto seleccionable. Nuestro sistema —y la mayoría de los filtros automáticos (ATS) que usan los reclutadores— no pueden leerlo, así que sería descartado. Crea una cuenta y te ayudamos a armar uno que sí funcione.",
    "cv_rejected_cta": "Crear cuenta y empezar",
    "cv_rejected_retry": "Elegir otro archivo",
```

- [ ] **Step 4: Añadir claves en `free_trial` (en)**

En `i18n/locales/en.json`, dentro de `"free_trial": {`, añadir tras la apertura:
```json
    "cv_rejected_title": "We couldn't read your CV",
    "cv_rejected_desc": "Your file looks like an image-based or scanned PDF with no selectable text. Our system —and most of the automated filters (ATS) recruiters use— can't read it, so it would be discarded. Create an account and we'll help you build one that works.",
    "cv_rejected_cta": "Create account and start",
    "cv_rejected_retry": "Choose another file",
```

- [ ] **Step 5: Validar JSON**

Run: `node -e "require('./i18n/locales/es.json');require('./i18n/locales/en.json');console.log('JSON ok')"`
Expected: imprime `JSON ok`.

- [ ] **Step 6: Commit**

```bash
git add i18n/locales/es.json i18n/locales/en.json
git commit -m "i18n: textos de pantalla de CV incompatible"
```

---

## Task 5: Pantalla de rechazo en `/import-cv` (logueado)

**Files:**
- Modify: `app/pages/import-cv.vue`

- [ ] **Step 1: Añadir estado y handlers en el `<script setup>`**

En `app/pages/import-cv.vue`, tras la línea `const auditResult = ref<AuditResult | null>(null)` (línea ~170), añadir:
```ts
const cvRejected = ref(false)

const goCreateFromScratch = () => {
  navigateTo('/profile')
}

const resetRejection = () => {
  cvRejected.value = false
  selectedFile.value = null
}
```

- [ ] **Step 2: Detectar el rechazo en el `catch` de `runMagicImport`**

Reemplazar el bloque `catch` (líneas ~237-243):
```ts
  } catch (e: any) {
    console.error(e)
    toast.error(t('importar_cv.toast_error'))
  } finally {
    importing.value = false
    auditRunning.value = false
  }
```
por:
```ts
  } catch (e: any) {
    console.error(e)
    if (isCvNotReadable(e)) {
      cvRejected.value = true
    } else {
      toast.error(t('importar_cv.toast_error'))
    }
  } finally {
    importing.value = false
    auditRunning.value = false
  }
```
(`isCvNotReadable` se auto-importa desde `app/utils`.)

- [ ] **Step 3: Ocultar el área de subida cuando hay rechazo**

Reemplazar la apertura del bloque de subida (línea ~75):
```vue
      <div v-if="!auditResult" class="relative z-10">
```
por:
```vue
      <div v-if="!auditResult && !cvRejected" class="relative z-10">
```

- [ ] **Step 4: Añadir la pantalla de rechazo en el template**

Justo **después** del cierre del bloque de subida — es decir, después de la línea
`      </div>` que está inmediatamente antes de `    </div>` y `  </div>` finales
(el `</div>` que cierra el `v-if="!auditResult && !cvRejected"`, línea ~147) —
insertar:
```vue
      <div v-if="cvRejected && !importing" class="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-400 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red/10 border-2 border-red/30">
          <span class="material-symbols-outlined text-3xl text-red">description_off</span>
        </div>
        <h2 class="font-head text-2xl font-bold text-text tracking-tight mb-3">{{ t('importar_cv.cv_rejected_title') }}</h2>
        <p class="text-[14px] text-text-muted leading-relaxed mb-8">{{ t('importar_cv.cv_rejected_desc') }}</p>

        <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goCreateFromScratch">
          <span class="material-symbols-outlined text-[18px] mr-2">edit_document</span>
          {{ t('importar_cv.cv_rejected_cta') }}
        </AppButton>

        <button @click="resetRejection" class="mt-4 text-[13px] text-text-dim hover:text-text transition-colors underline">
          {{ t('importar_cv.cv_rejected_retry') }}
        </button>
      </div>
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build completo sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/pages/import-cv.vue
git commit -m "feat: pantalla de CV incompatible en /import-cv"
```

---

## Task 6: Pantalla de rechazo en `/free-trial` (anónimo)

**Files:**
- Modify: `app/pages/free-trial.vue`

- [ ] **Step 1: Añadir estado y handlers en el `<script setup>`**

En `app/pages/free-trial.vue`, tras la línea `const importing = ref(false)` (línea ~283), añadir:
```ts
const cvRejected = ref(false)

const goCreateAccount = () => {
  navigateTo('/signup')
}

const resetRejection = () => {
  cvRejected.value = false
  selectedFile.value = null
}
```

- [ ] **Step 2: Detectar el rechazo en el `catch` de `runImport`**

Reemplazar el bloque `catch` (líneas ~342-348):
```ts
  } catch (e: any) {
    console.error('Error importing CV:', e)
    if (e?.statusCode === 403) {
      status.value.importUsed = true
    } else {
      toast.error(t('free_trial.toast_error'))
    }
  } finally {
```
por:
```ts
  } catch (e: any) {
    console.error('Error importing CV:', e)
    if (isCvNotReadable(e)) {
      cvRejected.value = true
    } else if (e?.statusCode === 403) {
      status.value.importUsed = true
    } else {
      toast.error(t('free_trial.toast_error'))
    }
  } finally {
```
(`isCvNotReadable` se auto-importa desde `app/utils`.)

- [ ] **Step 3: Ocultar la card de subida cuando hay rechazo**

Reemplazar la apertura de la card de subida (línea ~30):
```vue
        <AppCard v-if="!status.importUsed" :title="t('free_trial.upload_title')" class="mb-6 relative overflow-hidden">
```
por:
```vue
        <AppCard v-if="!status.importUsed && !cvRejected" :title="t('free_trial.upload_title')" class="mb-6 relative overflow-hidden">
```

- [ ] **Step 4: Añadir la card de rechazo**

Inmediatamente **después** del cierre `</AppCard>` de la card de subida (la línea
`        </AppCard>` en ~línea 78, antes del comentario `<!-- Audit result -->`),
insertar:
```vue
        <AppCard v-if="cvRejected" class="mb-6">
          <div class="text-center py-2">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red/10 border-2 border-red/30">
              <span class="material-symbols-outlined text-3xl text-red">description_off</span>
            </div>
            <h3 class="font-head text-xl font-bold text-text mb-3">{{ t('free_trial.cv_rejected_title') }}</h3>
            <p class="text-[14px] text-text-muted leading-relaxed mb-6">{{ t('free_trial.cv_rejected_desc') }}</p>
            <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goCreateAccount">
              <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>
              {{ t('free_trial.cv_rejected_cta') }}
            </AppButton>
            <button @click="resetRejection" class="mt-4 text-[13px] text-text-dim hover:text-text transition-colors underline">
              {{ t('free_trial.cv_rejected_retry') }}
            </button>
          </div>
        </AppCard>
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build completo sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/pages/free-trial.vue
git commit -m "feat: pantalla de CV incompatible en /free-trial"
```

---

## Task 7: Verificación final

**Files:** ninguno.

- [ ] **Step 1: Suite de tests completa**

Run: `npm test`
Expected: todos los tests pasan (incluye `cv-import` e `import-errors`).

- [ ] **Step 2: Verificación manual — logueado**

Con `npm run dev`, en `/import-cv` subir un PDF basado en imagen (escaneado, sin
texto seleccionable).
Expected: aparece la pantalla "No pudimos leer tu CV"; el botón "Crear mi CV desde
cero" navega a `/profile`; el enlace "Elegir otro archivo" vuelve al área de subida.

- [ ] **Step 3: Verificación manual — trial**

En `/free-trial` (sesión anónima/incógnito) subir el mismo PDF imagen.
Expected: aparece la card de rechazo; "Crear cuenta y empezar" navega a `/signup`;
y al volver a entrar, el import gratuito **sigue disponible** (no se consumió).

- [ ] **Step 4: Verificación manual — PDF válido sigue importando**

Subir un PDF con texto seleccionable en `/import-cv`.
Expected: importa normal y corre la auditoría (sin pantalla de rechazo).

---

## Notas de cierre

- Si durante la implementación el log del `catch` revela que `$fetch` expone el
  código en una ruta distinta a `err.data.data.code` / `err.data.code`, ampliar
  `isCvNotReadable` y su test con esa forma antes de cerrar la Task 3.
- El código `'CV_NOT_READABLE'` es el contrato entre `server/utils/cv-import.ts` y
  `app/utils/import-errors.ts`; si cambia, actualizar ambos y sus tests.
