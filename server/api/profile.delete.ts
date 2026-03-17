export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDb()

  try {
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
