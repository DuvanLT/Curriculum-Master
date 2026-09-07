# Diseño: Algoritmo de ajuste y coherencia del CV generado

**Fecha:** 2026-09-07
**Rama:** `cv-fit-algorithm`
**Stack:** Nuxt 4 (Vue) + Nitro. Generación con OpenAI `gpt-4o`. Export PDF con jsPDF `doc.html()`.

## Objetivo

Producir CVs coherentes con independencia del volumen de datos del usuario: una hoja bien
llena por defecto, y una segunda únicamente cuando esté justificada. El ajuste debe ser
determinista y verificable, no un efecto colateral del prompt.

## Problema

La calidad del CV generado varía de forma incontrolada con la cantidad de experiencia:

- **Poca experiencia** → CV que ocupa media hoja. Se ve pobre y poco profesional.
- **Mucha experiencia** → desborde a 2ª y 3ª página, o contenido cortado a mitad de línea.

No existe ninguna relación entre el contenido generado y el espacio físico de la página.

## Diagnóstico (causas raíz)

1. **`cvLength` clavado en 3.** En `app/pages/generator-cv.vue` hay `const cvLength = 3`
   fijo. El prompt siempre pide *"Extended mode: rich, detailed achievements. Include all
   relevant experiences"*, 5 logros por experiencia y summary de 600 caracteres. El CSS
   del slider (`.cv-length-slider`) sobrevive pero el control ya no existe.
   **Causa directa del desborde.**

2. **No existe presupuesto de espacio.** La IA escribe sin conocer la geometría de la
   página. Nada relaciona `nº experiencias × logros × longitud` con la altura disponible.

3. **No hay medición ni ajuste.** Nadie mide la altura renderizada. `min-height: 297mm` en
   los tres templates garantiza una hoja completa aunque el contenido ocupe un tercio.
   **Causa directa del "CV pequeño y poco profesional"**: no es corto, es una hoja
   completa medio vacía.

4. **Tipografía rígida.** Tamaños y márgenes hardcodeados inline en los 3 templates. No se
   puede comprimir un 7% para que quepa, ni expandir para llenar.

5. **`autoPaging: 'slice'`** en la exportación corta el contenido a mitad de línea al pasar
   de página. Causa del "CV con información incompleta".

**Hallazgo aprovechable:** `relevance_score` ya lo genera la IA
(`server/api/generate-cv.post.ts`), está declarado en el tipo del front
(`app/pages/generator-cv.vue`) y **no se consume en ningún sitio**. Ya se pagan esos
tokens. Es exactamente la señal que necesita el reparto por prioridad.

## Decisiones aprobadas

- **Meta de páginas:** 1 por defecto; 2 solo si se justifica. Nunca una 2ª hoja huérfana.
- **Déficit de contenido:** la palanca principal es **expandir contenido real** (summary
  más largo, más logros y más desarrollados). La tipografía es red de seguridad, no
  maquillaje de primera línea.
- **Anti-invención innegociable:** ninguna palanca añade hechos que el usuario no declaró.
  La expansión desarrolla lo existente.
- **Arquitectura:** presupuesto determinista en servidor + medición de píxeles reales en
  cliente. **Una sola llamada a la IA**, coste de tokens igual al actual.
- **Prioridad de poda:** relevancia a la JD × decaimiento por antigüedad.
- **Dos escalas de densidad** (tipografía y espaciado desacoplados).
- **Válvula "Experiencia previa"** para perfiles con muchísimos empleos.

## A. Modelo de coste

Traduce contenido a píxeles antes de renderizar. Geometría real del pipeline de export
(`windowWidth: 794`, `width: 210mm`):

```
factor            = 210 / 794            = 0.26448 mm/px
Página A4  297mm                         = 1122.9 px
Padding vertical (classic, 6mm × 2)      =   45.4 px
------------------------------------------------------
H_page (útil)                            = 1077.5 px
W_util  (210mm − 16mm de padding)        =  733.5 px
```

Caracteres por línea:

```
CPL(f) = W_util / (k · f)          k ≈ 0.50 para Helvetica (calibrable)

CPL(11px)   ≈ 133    cuerpo y bullets
CPL(11.5px) ≈ 127    summary
```

Coste por bloque, calibrado contra el CSS actual de `classic`:

| Bloque | Coste (px) |
|---|---|
| Header sin foto | 86 |
| Header con foto | 163 |
| Cabecera de sección (`h2` + borde) | 25–27 |
| Línea de summary | `ceil(chars/127) × 15.5` |
| Línea de skills | `ceil(chars/140) × 14 + 6` |
| Entrada de experiencia (título + herramientas + margen) | 41 |
| Bullet | `ceil(chars/130) × 14.85 + 1` |
| Entrada de educación | 34 |
| Sección idiomas | 40 |

`estimateHeight(model, templateProfile) → px` es una **función pura**: testeable sin
navegador, sin IA y sin PDF.

## B. Ecuación de presupuesto (servidor, antes de llamar a la IA)

```
H_exp = H_page · P  −  H_fijo  −  reserva(20px)
```

`H_fijo` = header + summary + cabeceras de sección + educación + idiomas.
`P` = páginas objetivo.

### Pesos por experiencia

```
w_i = relevancia_i^α  ×  recencia_i^β

recencia_i = 1 / (1 + años_desde_fin / τ)      τ = 5 años; empleo actual → 1.0
α = β = 1                                      (constantes calibrables)
```

Cuando la IA no devuelve `relevance_score` para una experiencia, `relevancia_i = 0.5`
(neutro), de modo que el reparto degrada a puramente cronológico.

### Reparto

```
L_disp    = (H_exp − 41 · n_exp) / 14.85              líneas de bullet disponibles
bullets_i = clamp( round(L_disp/1.5 · w_i/Σw), 1, min(5, maxCreible_i) )
chars_i   = clamp( L_disp/Σbullets · 130, 90, 240 )
```

### Techo de credibilidad (guarda anti-invención)

```
maxCreible_i = clamp( logros_desglosados_i.length + (skills_i.length > 0 ? 1 : 0), 1, 5 )
```

No se pueden pedir más bullets que logros distintos declarados, más uno sintetizable a
partir del cargo y el stack. Es el límite duro que impide que la expansión invente.

### Orden de asignación cuando sobra espacio

1. `bullets_i` por peso (base, ya calculado arriba)
2. `summaryChars`: 280 → 600
3. `bullets_i` y `chars_i` hacia su techo creíble
4. Si aún sobra → `deficit = true`, lo resuelve la densidad en cliente

**El summary deja de ser fijo.** Un junior recibe 600 caracteres; un senior con 7 empleos
recibe 280. Este cambio, por sí solo, corrige una parte sustancial del problema.

### Verificación con números reales

**Senior, 5 experiencias, 2 educaciones:**

```
H_fijo 461 → H_exp 596 → overhead 5×41=205 → 391px = 26 líneas
Reparto por w_i: 5, 4, 3, 3, 2 = 17 bullets           → 1 página exacta
```

**Junior, 1 experiencia + 1 proyecto:**

```
Contenido maximo creible  = 831px  / 1077 = ratio 0.77
x escala efectiva 1.248   = 1037px / 1077 = ratio 0.96   (dentro de tolerancia)
```

Es el caso que hoy produce el "CV pequeño y poco profesional": pasa de una hoja al 77%
—con casi un cuarto de página en blanco— a una hoja al 96%, sin inventar un solo dato.

## C. Escalas de densidad

Dos variables CSS, gobernadas por **un solo mando** `d` (densidad). El espacio en blanco
absorbe mucho más ajuste que la tipografía sin que se note, así que el espaciado se mueve
1.8× más rápido: **el espaciado hace el trabajo pesado y la tipografía apenas se toca**.

```
d ∈ [0.80, 1.36]                          mando único

--cv-space  = d
--cv-type   = clamp(1 + (d − 1)/1.8, 0.88, 1.20)
```

Los extremos encajan exactamente con los límites declarados:

```
d = 0.80  →  space 0.80,  type 0.89      (piso)
d = 1.00  →  space 1.00,  type 1.00      (neutro)
d = 1.36  →  space 1.36,  type 1.20      (techo)
```

Sobre un cuerpo de 11px, el rango de tipografía es 9.8px – 13.2px: ambos extremos dentro
de lo aceptable en CVs reales.

### Escala efectiva

`d` no comprime la altura de forma proporcional, porque solo una fracción de la página la
gobierna la tipografía. Con `φ` = fracción de la altura gobernada por el texto
(≈ 0.70 en `classic`, **calibrado por template**):

```
efectiva(d) = φ · type(d) + (1 − φ) · d

efectiva(0.80) = 0.862      ← PISO DE COMPRESION
efectiva(1.36) = 1.248      ← TECHO DE EXPANSION
```

Estas dos constantes son las que usa la decisión de páginas (sección E). Usar `0.88` o
`1.20` en su lugar sería un error: infravalora la capacidad real de ajuste.

Implementación: en cada template, `font-size: 11px` pasa a
`font-size: calc(11px * var(--cv-type))`, y los márgenes a `var(--cv-space)`. `calc()` y
las custom properties funcionan en el export porque html2canvas lee `getComputedStyle`,
que ya las resuelve.

## D. Escalera de ajuste

Determinista, orden fijo, sin heurísticas ocultas.

```
ratio = H_real / (H_page · P)
```

**Comprimir** (`ratio > 1.00`):

| # | Palanca | Rango |
|---|---|---|
| 1 | `d` — compresión suave, imperceptible | 1.00 → 0.92 |
| 2 | Podar bullets por `w_i` ascendente | nunca por debajo de 1 por experiencia |
| 3 | Ocultar línea "Herramientas" de las experiencias de menor `w_i` | — |
| 4 | Educación a 1 línea por entrada | — |
| 5 | `d` — hasta el piso | 0.92 → 0.80 (**piso duro**) |
| 6 | Pasar a `P = 2` | — |

**Expandir** (`ratio < 0.93`):

| # | Palanca | Rango |
|---|---|---|
| 1 | `summaryChars` | 280 → 600 |
| 2 | Bullets: más y más largos | hasta techo creíble, hasta 240 chars |
| 3 | `d` | 1.00 → 1.36 (**techo duro**) |
| 4 | Aceptar el ratio resultante | — |

Las palancas 1 y 2 de expansión son de contenido y viven en el presupuesto del servidor
(sección B); la 3 vive en el cliente. Las de compresión viven todas en el cliente, porque
solo ahí se conoce la altura real.

**Invariante:** ninguna experiencia desaparece de la línea temporal. Los huecos
cronológicos son una red flag para los reclutadores.

**Tolerancia de convergencia:** `ratio` objetivo en `[0.93, 1.00]`.

## E. Decisión 1 vs 2 páginas

La condición de "segunda hoja justificada" se **deriva** del criterio de llenado mínimo
del 60%, no se fija a ojo:

```
P = 2   ⟺   H_min_floor · 0.862      >  H_page       (ni al piso de compresion cabe)
             Y
            H_max_creible · 1.248    ≥  1.60 · H_page  (la 2a quedara >= 60% llena)

P = 1   en cualquier otro caso
```

Las constantes son las escalas efectivas de la sección C, no `0.88` / `1.20`.

El caso intermedio (no cabe en 1, pero la 2ª quedaría al 30%) resuelve a favor de **1
página comprimida**. Nunca se emite una hoja huérfana con cuatro líneas.

## F. Arquitectura y módulos

Núcleo puro, sin Vue, sin red, sin DOM. Sigue la convención existente de `shared/currency/`.

| Archivo | Responsabilidad |
|---|---|
| `shared/cv/types.ts` | `TemplateProfile`, `CVModel`, `Budget`, `FitPlan`, `PruneOp` |
| `shared/cv/geometry.ts` | Constantes A4 + perfil calibrado de cada template (costes por bloque, `k`, `φ`) |
| `shared/cv/cost-model.ts` | `estimateHeight(model, profile) → px` |
| `shared/cv/priority.ts` | `experienceWeights(exps) → w_i` |
| `shared/cv/budget.ts` | `computeBudget(input) → Budget` |
| `shared/cv/fit.ts` | `planFit(measuredPx, budget) → FitPlan` (la escalera de D) |

Integración:

| Archivo | Cambio |
|---|---|
| `server/api/generate-cv.post.ts` | Llama `computeBudget()` antes de construir el prompt. Presupuesto **por experiencia** en el prompt. Devuelve `budget` en la respuesta. |
| `app/composables/useCVFit.ts` | Mide el nodo offscreen, ejecuta `planFit()`, aplica variables y ops, re-mide. |
| `app/components/templates/CVTemplate.vue` | Refactor a `var(--cv-type)` / `var(--cv-space)` |
| `app/components/templates/CVminimalist.vue` | Ídem |
| `app/components/templates/CVdoublecolumn.vue` | Ídem |
| `app/pages/generator-cv.vue` | Elimina `cvLength = 3`. `autoPaging: 'slice'` → `'text'`. Páginas exactas; se retira el parche `deletePage`. |

`app/pages/templates.vue` renderiza previsualizaciones con datos de demo: se fija
`--cv-type: 1` y `--cv-space: 1`, sin bucle de ajuste.

**Alcance confirmado:** solo `generator-cv.vue` consume `/api/generate-cv` y exporta PDF.
`free-trial` no genera CVs.

## G. Bucle de convergencia en cliente

No es prueba y error:

```
1. Medir H_real una vez (nodo offscreen, ancho de export 794px)
2. Calibrar el modelo:  c = H_real / H_estimado    (el servidor solo necesita ±10%)
3. Resolver la escala analíticamente (la altura es ~lineal en la escala)
4. Bisección, ≤4 iteraciones, hasta ratio en [0.93, 1.00]
```

Cada iteración es un `requestAnimationFrame`: **~80ms en total**, frente a los ~8s de la
llamada a la IA. Imperceptible.

El nodo de medición vive permanentemente offscreen con `width: 794px`, de modo que la
medición y el export usen exactamente la misma caja.

## H. Contrato de datos

```ts
interface ExperienceBudget {
  id: string
  weight: number          // w_i normalizado
  bullets: number         // 1..5
  charsPerBullet: number  // 90..240
}

interface Budget {
  targetPages: 1 | 2
  summaryChars: number              // 280..600
  perExperience: ExperienceBudget[]
  collapsedExperienceIds: string[]  // válvula "Experiencia previa"
  estimatedHeightPx: number
  pageHeightPx: number
  deficit: boolean                  // el máximo creíble no llega a 0.93 de página
}

type PruneOp =
  | { kind: 'drop-bullet';         experienceId: string; index: number }
  | { kind: 'hide-tools';          experienceId: string }
  | { kind: 'compact-education' }
  | { kind: 'collapse-experience'; experienceId: string }

interface FitPlan {
  density: number     // d, mando unico: 0.80..1.36
  type: number        // derivado: clamp(1 + (d-1)/1.8, 0.88, 1.20)
  space: number       // derivado: d
  pruneOps: PruneOp[]
  pages: 1 | 2
  ratio: number       // H_real / (H_page * pages)
  converged: boolean  // ratio en [0.93, 1.00]
}
```

## I. Cambios en el prompt

El prompt deja de dar un límite global y pasa a dar un presupuesto por experiencia:

```
Antes:  MAX 5 logros_optimizados per experience

Ahora:  BUDGET (respétalo con exactitud):
        - summary: 340 caracteres
        - id=abc123 → 4 logros de ~180 caracteres cada uno
        - id=def456 → 3 logros de ~180 caracteres cada uno
        - id=ghi789 → 1 logro  de ~140 caracteres
```

Se conservan íntegras las reglas anti-invención vigentes (nada de métricas inventadas,
`top_skills` solo desde datos declarados, summary solo con lo que el usuario afirmó). Se
añade una regla explícita: *el presupuesto nunca justifica inventar contenido; si no hay
material real para llenar la cuota, devuelve menos.*

## J. Testing

`vitest` y `tests/shared/` ya están configurados. El núcleo es 100% funciones puras.

| Test | Qué asegura |
|---|---|
| `tests/shared/cv-cost-model.test.ts` | Costes por bloque, CPL, header con y sin foto |
| `tests/shared/cv-priority.test.ts` | Actual > antiguo; a igual recencia domina la relevancia; empates estables; `relevance_score` ausente degrada a cronológico |
| `tests/shared/cv-budget.test.ts` | Fixtures golden: junior(1), mid(3), senior(5), extremo(12+). Suma de bullets, clamps, `summaryChars`, techo de credibilidad |
| `tests/shared/cv-fit.test.ts` | Orden de la escalera, pisos y techos, decisión 1 vs 2 páginas, invariantes (nunca <1 bullet, nunca se elimina una experiencia) |

Adicionalmente, un *harness* de calibración (script, no test) que renderiza los fixtures y
compara altura real contra estimada para afinar `k` y los costes por bloque de cada
template.

## K. Casos límite

| Caso | Resolución |
|---|---|
| 0 experiencias | Perfil + educación; escalas al techo; se acepta un ratio bajo |
| Experiencia sin logros declarados | `maxCreible_i = 1`; la IA redacta desde cargo + skills |
| Foto activada | Header 86 → 163px; el presupuesto se recorta automáticamente |
| 25+ experiencias | Satura `P = 2`. **Válvula:** las más antiguas colapsan a un bloque compacto `"Experiencia previa: Cargo — Empresa (2005–2010)"`, una línea por empleo. Preserva la línea temporal sin gastar 41px por entrada |
| 3 templates distintos | Cada uno con su `TemplateProfile` calibrado por separado |
| La IA ignora el presupuesto | El cliente mide píxeles reales y poda: la medición es la autoridad final, el presupuesto solo acerca |

## L. Fases de entrega

```
F1  shared/cv/* puros + tests            núcleo verificable con `npm test`, sin tocar UI
F2  Servidor: presupuesto por experiencia en el prompt
F3  useCVFit + refactor de 'classic' a variables CSS
F4  Portar 'minimalist' y 'doublecolumn'
F5  Export: autoPaging 'text', páginas exactas, retirada del parche deletePage
```

F1 se valida por completo antes de tocar una sola línea de interfaz.

## M. Fuera de alcance

**RAG.** Se evaluó y se descarta para este spec. El problema es determinista (geometría y
presupuesto de caracteres), no una carencia de conocimiento. Un RAG con corpus de buenos
bullets por rol podría mejorar la *redacción* en una fase posterior, pero implementado
ahora produciría CVs de tres páginas mejor escritos: no resuelve nada de lo diagnosticado.

**Refactor no relacionado.** No se tocan `cv-audit`, `analyze`, `import` ni el resto del
pipeline de IA.
