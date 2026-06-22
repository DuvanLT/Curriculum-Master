import { requireVerifiedUserSession } from '../utils/verified-session'
import { deleteUserAccount } from '../utils/delete-account'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const db = useDb()
  const body = await readBody(event).catch(() => ({}))
  const { reason, comment } = body || {}

  try {
    // Save churn feedback first (before cascade delete wipes user data)
    if (reason) {
      await db.execute({
        sql: 'INSERT INTO churn_feedback (id, user_id, reason, comment) VALUES (?, ?, ?, ?)',
        args: [
          crypto.randomUUID(),
          userId,
          String(reason).trim(),
          comment ? String(comment).trim() : null
        ]
      })
    }

    // Delete the user. `orders` (FK sin cascade) se borra explícitamente dentro
    // del util; el resto de tablas hijas caen por ON DELETE CASCADE.
    await deleteUserAccount(db, userId)

    // Clear the user session after successful deletion
    await clearUserSession(event)

    return { success: true, message: 'Cuenta eliminada con éxito' }
  } catch (error: any) {
    console.error('Error al eliminar la cuenta:', userId, error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error interno al intentar eliminar la cuenta. Por favor contáctenos si el problema persiste.'
    })
  }
})
