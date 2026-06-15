# Free Trial sin cuenta registrada — Diseño

## Contexto y objetivo

Hoy, todo `/api/*` (excepto `/api/auth/*` y `/api/webhooks/*`) exige sesión verificada
([auth.ts](../../../server/middleware/auth.ts)). Esto obliga a registrarse antes de ver
cualquier valor del producto, lo que genera abandono.

Objetivo: permitir a un visitante anónimo subir su CV, ver un score de auditoría y un
match contra una vacante real, **sin crear cuenta**, y luego invitarlo a registrarse
para guardar ese resultado y continuar.

## Alcance

- 1 import de CV + 1 auditoría + 1 análisis de vacante por visitante anónimo.
- Identificación por cookie anónima (`bj_anon_id`), con tope por IP como respaldo
  anti-abuso (no como control de seguridad estricto).
- Migración automática del resultado a la cuenta nueva al registrarse.
- Nueva página pública `/free-trial` y ajuste del CTA principal del landing.

## 1. Identificación del visitante anónimo

Nuevo `server/utils/anon-trial.ts`:

- `getOrCreateAnonId(event)`:
  - Lee la cookie `bj_anon_id` (httpOnly, `sameSite: 'lax'`, `secure` en producción,
    `maxAge` 30 días).
  - Si no existe, genera un `uuidv4()`, la setea y la devuelve.
  - Al **crear** un anon_id nuevo (no en cada request), aplica un tope por IP usando
    un `Map` en memoria con el mismo patrón que
    [rate-limit.ts](../../../server/utils/rate-limit.ts) (`checkIpRateLimit`):
    máximo 5 anon_id nuevos por IP cada 24h. Si se excede, `getOrCreateAnonId`
    lanza un 429 (mismo `createError` que usa `checkIpRateLimit`), antes de crear
    cookie ni fila en `anonymous_trials`.

  **Nota de simplicidad**: el tope por IP es solo para frenar loops automatizados de
  "borrar cookies y repetir"; no necesita ser perfecto. Un visitante que ya tiene
  cookie válida nunca pasa por este tope, solo afecta la creación de IDs nuevos.

- `checkAnonAIRateLimit(event)`: variante de `checkUserAIRateLimit` (mismo archivo
  `rate-limit.ts`), pero keyed por IP en lugar de `userId`. Límite sugerido: 10
  llamadas/hora por IP a `/api/trial/*`. Es una defensa adicional — los flags por
  anon_id ya limitan a 1 uso cada uno.

## 2. Modelo de datos

Nueva tabla en `initDb()` de [db.ts](../../../server/utils/db.ts):

```sql
CREATE TABLE IF NOT EXISTS anonymous_trials (
  id TEXT PRIMARY KEY,              -- = bj_anon_id
  ip_hash TEXT,
  profile_json TEXT,
  experiences_json TEXT,
  educations_json TEXT,
  import_used INTEGER DEFAULT 0,
  audit_used INTEGER DEFAULT 0,
  audit_result_json TEXT,
  analyze_used INTEGER DEFAULT 0,
  jd_text TEXT,
  analysis_result_json TEXT,
  migrated_to_user_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

`ip_hash` = hash (sha256) de la IP, solo para auditoría/abuso — no se usa para
limitar el contenido en sí, solo el `Map` en memoria de la sección 1.

Cada flag (`import_used`, `audit_used`, `analyze_used`) permite **exactamente 1 uso**
por `id`. Una vez en 1, el endpoint correspondiente responde 403 con un mensaje que
invita a registrarse.

## 3. Endpoints públicos `/api/trial/*`

Excluidos del middleware global ([auth.ts](../../../server/middleware/auth.ts)):
agregar `/api/trial/` a la lista de prefijos exentos (igual que `/api/auth/` y
`/api/webhooks/`).

Todos llaman `getOrCreateAnonId(event)` y `checkAnonAIRateLimit(event)` al inicio.

### `POST /api/trial/import`
Igual que [import.post.ts](../../../server/api/import.post.ts) pero sin sesión:
- Verifica `import_used = 0` en `anonymous_trials` (si no existe la fila, la crea).
- Si ya se usó → 403 "Ya usaste tu importación gratuita. Crea una cuenta para
  continuar."
- Extrae el perfil del PDF (misma lógica OpenAI/unpdf existente).
- Upsert en `anonymous_trials`: `profile_json`, `experiences_json`,
  `educations_json`, `import_used = 1`.
- Devuelve el perfil extraído (igual shape que hoy) para que el frontend lo muestre.

### `POST /api/trial/audit`
Igual que [cv-audit.post.ts](../../../server/api/cv-audit.post.ts) sin sesión:
- Requiere que exista una fila en `anonymous_trials` con `profile_json` (si no,
  400 — primero debe importar).
- Verifica `audit_used = 0` → si no, 403 con mensaje de registro.
- El frontend envía `profile`/`experiences` en el body (los mismos que recibió de
  `/import`, eventualmente editados en memoria). El servidor llama OpenAI con esos
  valores y los vuelve a guardar en `profile_json`/`experiences_json` (sobrescribe
  lo de `/import`), para que la migración use siempre la versión más reciente.
- Guarda `audit_result_json`, marca `audit_used = 1`.
- **No** inserta en `job_analyses` (esa tabla es solo para usuarios reales); el
  resultado vive en `anonymous_trials` hasta la migración.

### `POST /api/trial/analyze`
Igual que [analyze.post.ts](../../../server/api/analyze.post.ts) sin sesión:
- Requiere fila existente en `anonymous_trials` (creada por `/import`).
- Verifica `analyze_used = 0` → si no, 403.
- Llama OpenAI con `jd` + `profile`/`experiences`.
- Guarda `jd_text`, `analysis_result_json`, marca `analyze_used = 1`.

### `GET /api/trial/status`
- Lee `anonymous_trials` por `bj_anon_id` (sin crearlo si no existe).
- Devuelve `{ importUsed, auditUsed, analyzeUsed, profile, auditResult,
  analysisResult }` (o defaults vacíos si no existe fila).
- Permite que un visitante que vuelve vea su resultado sin re-llamar IA.

## 4. Migración al registrarse

En [signup.post.ts](../../../server/api/auth/signup.post.ts), después de crear el
usuario y antes de `setUserSession`:

1. Leer `bj_anon_id` de la cookie (sin crearlo si no existe).
2. Buscar en `anonymous_trials` la fila con ese `id` y `migrated_to_user_id IS NULL`.
3. Si existe y tiene `profile_json`:
   - Parsear `profile_json` / `experiences_json` / `educations_json`.
   - Llamar a un nuevo helper compartido `saveUserProfile(db, userId, { profile,
     educations, experiences })`, extraído de la lógica de persistencia que hoy
     vive en [profile.post.ts](../../../server/api/profile.post.ts) (refactor:
     mover esa lógica a `server/utils/profile.ts` y que `profile.post.ts` la
     reutilice también).
4. Si `audit_result_json` existe, insertar en `job_analyses` con
   `jd_text = 'Auditoría inicial de CV'` (mismo shape que usa hoy
   [cv-audit.post.ts](../../../server/api/cv-audit.post.ts)).
5. Si `analysis_result_json` existe, insertar en `job_analyses` con el `jd_text`
   guardado.
6. Marcar `anonymous_trials.migrated_to_user_id = userId`.
7. Borrar la cookie `bj_anon_id`.

Si no hay fila o no tiene `profile_json`, el signup continúa igual que hoy (sin
cambios de comportamiento).

## 5. Frontend

### Página pública `/free-trial`
- Agregar `/free-trial` a `publicRoutes` en
  [auth.global.ts](../../../app/middleware/auth.global.ts).
- Layout `false` (como landing) o layout simple, reutilizando estilos de
  [import-cv.vue](../../../app/pages/import-cv.vue).
- Flujo en una sola pantalla:
  1. Al cargar, llama `GET /api/trial/status`.
     - Si `importUsed/auditUsed/analyzeUsed` ya están en `true`, muestra
       directamente los resultados guardados + CTA de registro (no vuelve a
       llamar IA).
  2. Si no se ha usado: dropzone para subir CV → `POST /api/trial/import`.
  3. Tras importar, muestra automáticamente el resultado de
     `POST /api/trial/audit` (reutilizando el bloque de UI de score/fortalezas/
     debilidades de `import-cv.vue`).
  4. Debajo, un textarea opcional "Pega una vacante" → `POST /api/trial/analyze`,
     muestra el resultado reutilizando el bloque de score circular + keywords de
     [analysis.vue](../../../app/pages/analysis.vue).
  5. CTA persistente y visible en todo momento: "Crea tu cuenta gratis para
     guardar este resultado y generar tu CV optimizado" → `/signup`.
- Manejo de 403 (límite ya usado): mostrar mensaje "Ya usaste tu prueba gratuita"
  + CTA de registro, sin romper la página.

### Landing
- En [landing.vue](../../../app/pages/landing.vue), `primaryCta` para visitantes
  no logueados cambia de `/signup` a `/free-trial`. El botón "Iniciar sesión" y el
  link "Crear cuenta" del footer siguen apuntando a `/login` / `/signup` sin
  cambios.

### i18n
- Nuevas claves bajo un namespace `free_trial` (o reutilizar las de
  `importar_cv`/`analisis` donde aplique) en `i18n/locales/es.json` y `en.json`.

## 6. Resumen de cambios por archivo

| Archivo | Cambio |
|---|---|
| `server/utils/anon-trial.ts` | **Nuevo** — `getOrCreateAnonId`, lógica de tope por IP |
| `server/utils/rate-limit.ts` | Agregar `checkAnonAIRateLimit` (keyed por IP) |
| `server/utils/db.ts` | Agregar tabla `anonymous_trials` + índice por `id` |
| `server/utils/profile.ts` | **Nuevo** — extraer `saveUserProfile()` desde `profile.post.ts` |
| `server/api/profile.post.ts` | Usar `saveUserProfile()` |
| `server/api/trial/import.post.ts` | **Nuevo** |
| `server/api/trial/audit.post.ts` | **Nuevo** |
| `server/api/trial/analyze.post.ts` | **Nuevo** |
| `server/api/trial/status.get.ts` | **Nuevo** |
| `server/middleware/auth.ts` | Excluir `/api/trial/` |
| `server/api/auth/signup.post.ts` | Migración de `anonymous_trials` → perfil + `job_analyses` |
| `app/middleware/auth.global.ts` | Agregar `/free-trial` a `publicRoutes` |
| `app/pages/free-trial.vue` | **Nuevo** |
| `app/pages/landing.vue` | `primaryCta` → `/free-trial` para no logueados |
| `i18n/locales/es.json`, `en.json` | Nuevas claves para `/free-trial` |

## 7. Fuera de alcance (no se implementa ahora)

- Limpieza periódica de filas viejas de `anonymous_trials` sin migrar.
- Generación de CV (`/api/generate-cv`) en modo anónimo — sigue requiriendo cuenta.
- Edición del perfil extraído antes de la auditoría en modo anónimo (se muestra
  tal cual lo extrae la IA).
