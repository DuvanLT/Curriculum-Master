# Diseño: Contador de escasez en Free Trial

**Fecha:** 2026-06-18
**Rama:** `feature/google-login` (continúa la sesión actual)
**Alcance:** App web — página `/free-trial`.

## Objetivo

Estrategia de marketing de escasez: mostrar en `/free-trial` un banner del tipo
"¡Solo quedan X análisis gratis disponibles! No te quedes sin el tuyo." donde
`X = 15 - (total de anonymous_trials % 15)`. Crea urgencia para que el visitante use
su análisis. El número **nunca llega a 0**: al alcanzar un múltiplo de 15 el contador
"se reinicia" a 15, sin borrar ni modificar nada en la base de datos.

## Contexto actual

- `/free-trial` (`app/pages/free-trial.vue`) ya consulta `/api/trial/status` en
  `onMounted` para saber qué partes del trial ya se usaron.
- `server/api/trial/status.get.ts` lee la fila de `anonymous_trials` del visitante
  (por `anonId` de cookie) y devuelve flags de uso; si no hay `anonId`, retorna un
  objeto `empty` temprano.
- La tabla `anonymous_trials` acumula una fila por trial (se crea en el INSERT de
  `trial/import.post.ts`).

## Decisiones de diseño aprobadas

- **Fórmula:** `restantes = 15 - (total % 15)`. Rango 1..15, cicla 15→1→15.
- **Conteo:** `COUNT(*)` de **todas** las filas de `anonymous_trials` (sin filtros).
- **Ubicación:** banner fijo arriba (bajo el header, sobre todo el contenido),
  **siempre visible** en todos los estados de la página una vez cargado el número.
- **Sin tocar la DB:** el "reinicio" es puramente aritmético (módulo); no hay
  borrado ni escritura.
- **Sin tiempo real:** el número se calcula al cargar la página.

## Arquitectura

### 1. Backend — cálculo puro (testeable)

Nuevo `server/utils/trial-slots.ts`:
```ts
export const TRIAL_SLOTS_TOTAL = 15

export function computeTrialSlots(count: number): number {
  return TRIAL_SLOTS_TOTAL - (count % TRIAL_SLOTS_TOTAL)
}
```
Casos: 0→15, 1→14, 14→1, 15→15, 16→14, 30→15.

### 2. Backend — exponer el número en el status

Modificar `server/api/trial/status.get.ts`:
- Calcular el conteo y los cupos **antes** de cualquier `return`:
  ```ts
  const db = useDb()
  const countResult = await db.execute('SELECT COUNT(*) AS c FROM anonymous_trials')
  const slotsRemaining = computeTrialSlots(Number((countResult.rows[0] as any).c || 0))
  ```
  (Nota: hoy `db` se instancia después del early-return `empty`; moverlo arriba.)
- Incluir `slotsRemaining` en **ambas** respuestas: la `empty` (sin `anonId`) y la
  completa (con fila). El objeto `empty` pasa a incluir `slotsRemaining`.

### 3. Frontend — banner de escasez

En `app/pages/free-trial.vue`:
- Nuevo `const slotsRemaining = ref<number | null>(null)`.
- En `onMounted`, tras recibir `data` de `/api/trial/status`:
  `slotsRemaining.value = typeof data.slotsRemaining === 'number' ? data.slotsRemaining : null`.
- Banner `v-if="slotsRemaining !== null"` colocado tras el bloque header (antes de
  `Status loading`), siempre visible:
  - Estilo de urgencia: fondo/borde con acento ámbar (`bg-amber/10`,
    `border-amber/30`), ícono `local_fire_department` (Material Symbols, válido).
  - Texto: `t('free_trial.slots_banner', { count: slotsRemaining })`.
- No se muestra hasta tener el número (evita parpadeo de un valor incorrecto).

### 4. i18n

Nuevas claves en `free_trial` (es + en), con interpolación `{count}`:
- es: `"slots_banner": "¡Solo quedan {count} análisis gratis disponibles! No te quedes sin el tuyo."`
- en: `"slots_banner": "Only {count} free analyses left! Don't miss out on yours."`

## Flujo de datos

```
Carga /free-trial
  → onMounted: GET /api/trial/status
  → backend: COUNT(*) anonymous_trials -> computeTrialSlots(count) -> slotsRemaining
  → respuesta incluye slotsRemaining (siempre)
  → frontend: slotsRemaining.value = data.slotsRemaining
  → banner "¡Solo quedan {count}...!" visible
```

## Manejo de errores

- Si `/api/trial/status` falla (el `catch` existente en `onMounted`), `slotsRemaining`
  queda en `null` y el banner simplemente no se muestra (degradación silenciosa, sin
  romper la página).

## Estrategia de pruebas

**Unit (vitest):**
- `computeTrialSlots`: 0→15, 14→1, 15→15, 16→14, 30→15 (nunca 0, rango 1..15).

**Manual:**
- Abrir `/free-trial` → el banner muestra `15 - (COUNT(*) % 15)` con el conteo real.
- Verificar contra la DB que el número coincide con la fórmula.

## Fuera de alcance

- Tiempo real / actualización en vivo del número.
- Reservar o persistir cupos por usuario.
- Cambiar el total (15) por configuración (queda como constante).
