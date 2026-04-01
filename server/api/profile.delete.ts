export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
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

    // Delete the user from the database.
    // ON DELETE CASCADE will handle experiences, applications, etc.
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId]
    })

    // Clear the user session after successful deletion
    await clearUserSession(event)

    return { success: true, message: 'Cuenta eliminada con éxito' }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error interno al intentar eliminar la cuenta. Por favor contáctenos si el problema persiste.'
    })
  }
})
