export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { locale } = body

  if (!locale || !['es', 'en'].includes(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid locale' })
  }

  const db = useDb()
  await db.execute({
    sql: 'UPDATE users SET preferred_locale = ? WHERE id = ?',
    args: [locale, session.user.id]
  })

  // Update session with new locale
  await setUserSession(event, {
    user: { ...session.user, preferred_locale: locale }
  })

  return { success: true }
})
