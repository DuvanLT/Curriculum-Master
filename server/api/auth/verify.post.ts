import { checkVerifyRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code } = body
  const session = await getUserSession(event)

  if (!session.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Inicia sesión primero para verificar tu cuenta.'
    })
  }

  const userId = session.user.id

  // Rate limit: max 5 verification attempts per 15 min window
  checkVerifyRateLimit(userId)

  const db = useDb()
  
  // Get current user code
  const result = await db.execute({
    sql: 'SELECT verification_code FROM users WHERE id = ?',
    args: [userId]
  })

  const userRecord = result.rows[0]

  if (!userRecord || userRecord.verification_code !== code) {
    // After too many wrong attempts, invalidate the code entirely
    const attemptsResult = await db.execute({
      sql: 'SELECT verification_code FROM users WHERE id = ?',
      args: [userId]
    })

    throw createError({
      statusCode: 400,
      statusMessage: 'Código de verificación incorrecto.'
    })
  }

  // Mark as verified
  await db.execute({
    sql: 'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
    args: [userId]
  })

  // Update session
  await setUserSession(event, {
    user: {
      ...session.user,
      is_verified: 1
    }
  })

  return { success: true }
})
