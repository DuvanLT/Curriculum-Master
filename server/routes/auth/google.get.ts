import { migrateAnonymousTrial } from '../../utils/migrate-trial'
import { buildSessionUser, resolveGoogleUser } from '../../utils/google-user'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile', 'openid'],
  },
  async onSuccess(event, { user: googleUser }) {
    const db = useDb()

    // Locale preferido: cookie i18n si existe, fallback 'es'.
    const localeCookie = getCookie(event, 'i18n_redirected')
    const locale = ['es', 'en'].includes(localeCookie || '') ? (localeCookie as string) : 'es'

    const { record, isNew } = await resolveGoogleUser(
      db,
      {
        sub: googleUser.sub,
        email: googleUser.email,
        name: googleUser.name,
        email_verified: googleUser.email_verified,
      },
      locale,
    )

    if (isNew) {
      await migrateAnonymousTrial(event, db, record.id)
    }

    await setUserSession(event, { user: buildSessionUser(record) })

    return sendRedirect(event, '/profile')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=google')
  },
})
