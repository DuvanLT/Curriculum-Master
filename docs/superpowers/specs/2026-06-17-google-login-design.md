# Diseño: Login con Google (OAuth)

**Fecha:** 2026-06-17
**Rama:** `feature/google-login`
**Alcance:** Solo la app web (Nuxt). La extensión de Chrome queda fuera de esta entrega.

## Objetivo

Añadir "Continuar con Google" como método de inicio de sesión / registro en la app
web, **sin romper** el flujo actual de email+contraseña ni las reglas de negocio que
dependen del login (verificación, trial, suscripción, migración de trial anónimo).

## Contexto actual

- Autenticación basada en `nuxt-auth-utils` (`setUserSession` / `getUserSession`).
- Tabla `users` con `password TEXT NOT NULL`, `is_verified` (0/1),
  `subscription_name` (default `free_trial`), `preferred_locale`.
- Reglas de negocio atadas al login:
  1. **Verificación por email**: signup genera un código de 6 dígitos →
     `is_verified=0` hasta validar. `requireVerifiedUserSession` bloquea funciones
     si `is_verified !== 1`.
  2. **Trial / suscripción**: usuarios nuevos reciben `subscription_name='free_trial'`.
  3. **Migración de trial anónimo**: al registrarse se migran datos de
     `anonymous_trials` al usuario (≈70 líneas embebidas hoy en `signup.post.ts`).
  4. **Locale**: al iniciar sesión se aplica `preferred_locale` del usuario.

## Decisiones de diseño aprobadas

- **Colisión de email**: si el email ya existe → **vincular automáticamente** a la
  cuenta existente (mismo perfil, trial, suscripción). Google queda como método
  adicional de entrada. Seguro porque Google verifica el email.
- **Alcance**: solo app web. Flujo OAuth estándar de redirect server-side.
- **Verificación**: los usuarios que entran con Google quedan **`is_verified=1`
  automáticamente** (se saltan el código por email), siempre que Google reporte
  `email_verified`.
- **Implementación**: usar el handler nativo `defineOAuthGoogleEventHandler` de
  `nuxt-auth-utils` (ya instalado), no OAuth manual.

## Arquitectura

### 1. Configuración en Google Cloud (manual, fuera del código)

- OAuth 2.0 Client ID tipo "Web application".
- **Authorized redirect URIs**:
  - `http://localhost:3000/auth/google` (dev)
  - `https://bringjobs.qaliby.com/auth/google` (prod)
- OAuth consent screen con scopes `email`, `profile`, `openid`.
- Genera Client ID + Client Secret → al `.env`.

### 2. Variables de entorno y config

`.env`:
```
NUXT_OAUTH_GOOGLE_CLIENT_ID=...
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=...
```

`nuxt.config.ts` → `runtimeConfig`:
```ts
oauth: { google: { clientId: '', clientSecret: '' } }
```
(`nuxt-auth-utils` lee automáticamente `NUXT_OAUTH_GOOGLE_*`.)

### 3. Cambio de esquema (tabla `users`)

Sin reconstruir la tabla; se usan las migraciones ALTER simples ya existentes en
`server/utils/db.ts` (array de columnas + whitelist `ALLOWED_COLUMN_NAMES`):

- `auth_provider TEXT DEFAULT 'password'` — cómo se registró el usuario.
- `google_sub TEXT` — ID único de Google (`sub`), para vincular de forma robusta.

`password` sigue siendo `NOT NULL`: para usuarios de Google se inserta un **hash
bcrypt de un valor aleatorio inservible** (satisface el constraint; nunca podrán
entrar con contraseña porque no la conocen; podrán usar "recuperar contraseña" si
desean fijar una).

### 4. Server route: `server/routes/auth/google.get.ts`

`defineOAuthGoogleEventHandler({ config, onSuccess, onError })`.

`onSuccess(event, { user: googleUser })`:
1. Normalizar email a minúsculas; leer `email_verified`, `name`, `sub`.
2. Buscar usuario por email.
   - **Existe** → vincular:
     - `UPDATE users SET google_sub=?, is_verified=1 WHERE id=?`
       (solo set `is_verified=1` si Google reporta verificado).
     - Construir el objeto `user` de sesión desde el registro existente
       (preservando `subscription_name`, `last_payment_at`, `preferred_locale`).
   - **No existe** → crear:
     - `INSERT` con `id=uuid`, `email`, `password=<hash aleatorio>`, `name`,
       `is_verified=1`, `preferred_locale=<locale actual>`,
       `subscription_name='free_trial'`, `auth_provider='google'`, `google_sub`.
     - Ejecutar **migración de trial anónimo** (util compartido, ver §5).
3. `setUserSession(event, { user })` con **exactamente la misma forma** que
   `login.post.ts` (`id, email, name, is_verified, preferred_locale,
   subscription_name, last_payment_at`).
4. `sendRedirect(event, '/profile')`.

`onError(event, error)`: log + `sendRedirect(event, '/login?error=google')`.

### 5. Refactor puntual: `server/utils/migrate-trial.ts`

Extraer la lógica de migración de trial anónimo (hoy embebida en
`signup.post.ts`) a `migrateAnonymousTrial(event, db, userId): Promise<boolean>`.
- `signup.post.ts` pasa a llamar este util (sin cambio de comportamiento).
- El handler de Google lo reutiliza.

### 6. Frontend

- Botón **"Continuar con Google"** en `app/pages/login.vue` y `app/pages/signup.vue`:
  un enlace `<a href="/auth/google">` (no `NuxtLink`, debe ser navegación real para
  disparar el redirect server-side). Separador visual "o".
- En `login.vue`: leer `?error=google` del query y mostrar mensaje de error.
- Strings i18n nuevos en `i18n/locales/es.json` y `en.json`
  (`auth.continue_with_google`, `auth.or`, `auth.google_error`).

## Flujo de datos

```
Usuario click "Continuar con Google"
  → GET /auth/google
  → defineOAuthGoogleEventHandler redirige a Google
  → Google autentica y redirige a /auth/google?code=...
  → onSuccess: buscar/crear/vincular usuario en DB
  → setUserSession
  → redirect /profile
```

## Manejo de errores

- Fallo de OAuth (usuario cancela, error de Google) → `onError` →
  `/login?error=google` con mensaje localizado.
- Email de Google no verificado (raro) → se crea/vincula pero **no** se fuerza
  `is_verified=1` (se respeta el flujo de verificación normal).
- Fallo en migración de trial → se loguea y no bloquea el login (igual que hoy en
  signup).

## Reglas de negocio resultantes

| Regla | Usuario Google |
|---|---|
| Verificación por email (código) | Se salta → `is_verified=1` si email verificado |
| Trial / suscripción | Nuevo = `free_trial` |
| Migración de trial anónimo | Sí se aplica |
| Email duplicado | Se vincula a la cuenta existente |
| Login con contraseña | Sin cambios |

## Estrategia de pruebas

- **Nuevo usuario con Google** (sin cuenta previa): se crea con `free_trial`,
  `is_verified=1`, `auth_provider='google'`, sesión válida, redirige a `/profile`.
- **Usuario existente (email+contraseña) entra con Google**: se vincula, conserva
  suscripción y perfil, `google_sub` poblado.
- **Login con contraseña sigue intacto** tras los cambios (signup + login + verify).
- **Migración de trial**: usuario anónimo con datos → entra con Google → datos
  migrados.
- **Error de OAuth**: redirige a `/login?error=google` y muestra mensaje.

## Fuera de alcance

- Google login en la extensión de Chrome (segunda fase).
- One Tap / botón embebido de Google Identity Services (se usa redirect estándar).
- Desvincular Google desde el perfil (futuro).
