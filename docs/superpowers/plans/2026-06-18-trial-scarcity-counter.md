# Contador de escasez en Free Trial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar en `/free-trial` un banner "¡Solo quedan X análisis gratis disponibles!" donde `X = 15 - (COUNT(*) de anonymous_trials % 15)`, que nunca llega a 0 (cicla 15→1→15) sin tocar la DB.

**Architecture:** Una función pura calcula los cupos a partir del conteo. El endpoint `/api/trial/status` (que la página ya consulta al montar) añade `slotsRemaining` a su respuesta. La página renderiza un banner fijo arriba con ese número.

**Tech Stack:** Nuxt 4, Nitro/h3, @libsql/client (Turso), vitest, @nuxtjs/i18n.

**Spec:** `docs/superpowers/specs/2026-06-18-trial-scarcity-counter-design.md`

---

## File Structure

- `server/utils/trial-slots.ts` — **Crear**. `TRIAL_SLOTS_TOTAL` + `computeTrialSlots(count)`.
- `tests/server/trial-slots.test.ts` — **Crear**. Tests de la función pura.
- `server/api/trial/status.get.ts` — **Modificar**. Calcular `COUNT(*)` y añadir `slotsRemaining` a ambas respuestas.
- `i18n/locales/es.json` / `en.json` — **Modificar**. Clave `free_trial.slots_banner`.
- `app/pages/free-trial.vue` — **Modificar**. Ref `slotsRemaining` + banner en el template.

---

## Task 1: Función pura `computeTrialSlots`

**Files:**
- Create: `server/utils/trial-slots.ts`
- Test: `tests/server/trial-slots.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/server/trial-slots.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeTrialSlots, TRIAL_SLOTS_TOTAL } from '../../server/utils/trial-slots'

describe('computeTrialSlots', () => {
  it('total = 15', () => {
    expect(TRIAL_SLOTS_TOTAL).toBe(15)
  })

  it('cuenta 0 -> 15 (lleno)', () => {
    expect(computeTrialSlots(0)).toBe(15)
  })

  it('va bajando: 1 -> 14, 14 -> 1', () => {
    expect(computeTrialSlots(1)).toBe(14)
    expect(computeTrialSlots(14)).toBe(1)
  })

  it('en múltiplos de 15 reinicia a 15 (nunca 0)', () => {
    expect(computeTrialSlots(15)).toBe(15)
    expect(computeTrialSlots(30)).toBe(15)
  })

  it('tras el reinicio sigue bajando: 16 -> 14', () => {
    expect(computeTrialSlots(16)).toBe(14)
  })

  it('nunca devuelve 0 ni fuera de rango 1..15', () => {
    for (let n = 0; n <= 100; n++) {
      const slots = computeTrialSlots(n)
      expect(slots).toBeGreaterThanOrEqual(1)
      expect(slots).toBeLessThanOrEqual(15)
    }
  })
})
```

- [ ] **Step 2: Correr para ver que falla**

Run: `npx vitest run tests/server/trial-slots.test.ts`
Expected: FAIL — módulo `server/utils/trial-slots` no existe.

- [ ] **Step 3: Implementar**

Crear `server/utils/trial-slots.ts`:
```ts
export const TRIAL_SLOTS_TOTAL = 15

// Cupos "restantes" mostrados con estrategia de escasez. Cicla 15→1→15 a medida
// que crece el conteo, sin llegar nunca a 0 (en múltiplos de TRIAL_SLOTS_TOTAL
// reinicia a TRIAL_SLOTS_TOTAL). Es puramente aritmético: no toca la base de datos.
export function computeTrialSlots(count: number): number {
  return TRIAL_SLOTS_TOTAL - (count % TRIAL_SLOTS_TOTAL)
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run tests/server/trial-slots.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add server/utils/trial-slots.ts tests/server/trial-slots.test.ts
git commit -m "feat: computeTrialSlots para contador de escasez"
```
(Terminar el mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 2: Exponer `slotsRemaining` en `/api/trial/status`

**Files:**
- Modify: `server/api/trial/status.get.ts`

Contenido actual del archivo (referencia):
```ts
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

- [ ] **Step 1: Reescribir el handler completo**

Reemplazar TODO el contenido de `server/api/trial/status.get.ts` por:
```ts
import { getAnonId } from '../../utils/anon-trial'
import { computeTrialSlots } from '../../utils/trial-slots'

export default defineEventHandler(async (event) => {
  const anonId = getAnonId(event)
  const db = useDb()

  // Cupos de escasez: depende del total de trials, no del visitante.
  const countResult = await db.execute('SELECT COUNT(*) AS c FROM anonymous_trials')
  const slotsRemaining = computeTrialSlots(Number((countResult.rows[0] as any).c || 0))

  const empty = {
    importUsed: false,
    auditUsed: false,
    analyzeUsed: false,
    profile: null,
    experiences: [] as any[],
    auditResult: null,
    jdText: '',
    analysisResult: null,
    slotsRemaining
  }

  if (!anonId) return empty

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
    analysisResult: row.analysis_result_json ? JSON.parse(row.analysis_result_json as string) : null,
    slotsRemaining
  }
})
```

- [ ] **Step 2: Verificar que el build compila**

Run: `npm run build`
Expected: "Build complete!" sin errores. (Comando lento; esperar varios minutos.)

- [ ] **Step 3: Commit**

```bash
git add server/api/trial/status.get.ts
git commit -m "feat: status del trial expone slotsRemaining"
```
(Terminar el mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 3: i18n — clave `slots_banner`

**Files:**
- Modify: `i18n/locales/es.json`
- Modify: `i18n/locales/en.json`

- [ ] **Step 1: Añadir la clave en español**

En `i18n/locales/es.json`, dentro del namespace `"free_trial": {`, justo después de su
llave de apertura, añadir:
```json
    "slots_banner": "¡Solo quedan {count} análisis gratis disponibles! No te quedes sin el tuyo.",
```

- [ ] **Step 2: Añadir la clave en inglés**

En `i18n/locales/en.json`, dentro del namespace `"free_trial": {`, justo después de su
llave de apertura, añadir:
```json
    "slots_banner": "Only {count} free analyses left! Don't miss out on yours.",
```

- [ ] **Step 3: Validar JSON**

Run: `node -e "require('./i18n/locales/es.json');require('./i18n/locales/en.json');console.log('JSON ok')"`
Expected: imprime `JSON ok`.

- [ ] **Step 4: Commit**

```bash
git add i18n/locales/es.json i18n/locales/en.json
git commit -m "i18n: texto del banner de escasez del trial"
```
(Terminar el mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 4: Banner en `free-trial.vue`

**Files:**
- Modify: `app/pages/free-trial.vue`

Contexto: el `<script setup>` declara refs como `statusLoaded`, `status`,
`cvRejected`, etc. El `onMounted` hace `const data = await $fetch<any>('/api/trial/status')`
y asigna `status.value`. El template tiene un bloque header
(`<!-- Header -->`) seguido de `<!-- Status loading -->`.

- [ ] **Step 1: Declarar el ref `slotsRemaining`**

En `app/pages/free-trial.vue`, junto a las otras refs de estado (después de
`const status = ref({ importUsed: false, auditUsed: false, analyzeUsed: false })`),
añadir:
```ts
const slotsRemaining = ref<number | null>(null)
```

- [ ] **Step 2: Setear `slotsRemaining` desde la respuesta del status**

En `onMounted`, dentro del `try`, después del bloque que asigna `status.value = {...}`
(es decir tras la línea `}` que cierra ese objeto, antes de `if (data.profile)`),
añadir:
```ts
    slotsRemaining.value = typeof data.slotsRemaining === 'number' ? data.slotsRemaining : null
```

- [ ] **Step 3: Añadir el banner en el template**

En el template, localizar el cierre del bloque header:
```html
        <p class="text-[13px] text-text-dim font-mono">{{ t('free_trial.subtitle') }}</p>
      </div>
```
Inmediatamente **después** de ese `</div>` (cierre del header) e **antes** del
comentario `<!-- Status loading -->`, insertar:
```html
      <!-- Scarcity banner -->
      <div
        v-if="slotsRemaining !== null"
        class="flex items-center justify-center gap-2 bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 mb-6 text-center animate-in fade-in duration-300"
      >
        <span class="material-symbols-outlined text-amber text-[20px]">local_fire_department</span>
        <span class="text-[13px] sm:text-[14px] font-medium text-text">
          {{ t('free_trial.slots_banner', { count: slotsRemaining }) }}
        </span>
      </div>
```

- [ ] **Step 4: Verificar que el build compila**

Run: `npm run build`
Expected: "Build complete!" sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/pages/free-trial.vue
git commit -m "feat: banner de escasez en free-trial"
```
(Terminar el mensaje con: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`)

---

## Task 5: Verificación final

**Files:** ninguno.

- [ ] **Step 1: Suite completa de tests**

Run: `npm test`
Expected: todos los tests pasan (incluye `trial-slots`).

- [ ] **Step 2: Verificación manual del número**

Con el dev server (`npm run dev`), abrir `http://localhost:3000/free-trial`.
Expected: aparece el banner "¡Solo quedan X análisis gratis disponibles!".

- [ ] **Step 3: Confirmar el número contra la DB**

Run:
```bash
node -e "require('dotenv').config();const{createClient}=require('@libsql/client');const c=createClient({url:process.env.NUXT_TURSO_URL,authToken:process.env.NUXT_TURSO_TOKEN});c.execute('SELECT COUNT(*) AS c FROM anonymous_trials').then(r=>{const n=Number(r.rows[0].c);console.log('count=',n,'-> esperado en banner=',15-(n%15))})"
```
Expected: el número impreso coincide con el del banner.

---

## Notas de cierre

- `computeTrialSlots` mantiene la fórmula y el total (15) en un único lugar.
- El banner degrada en silencio: si `/api/trial/status` falla, `slotsRemaining` queda
  `null` y el banner no se muestra (la página sigue funcionando).
- No se escribe ni borra nada en la DB; el "reinicio" es puramente aritmético.
