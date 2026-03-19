import type { H3Event } from 'h3'

export async function requireVerifiedUserSession(event: H3Event) {
  const session = await requireUserSession(event)

  if (Number(session.user?.is_verified || 0) !== 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Debes verificar tu cuenta antes de usar esta funcion.'
    })
  }

  return session
}
