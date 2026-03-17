export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { id } = body
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID de aplicación requerido'
    })
  }

  const db = useDb()
  
  try {
    await db.execute({
      sql: 'DELETE FROM applications WHERE id = ? AND user_id = ?',
      args: [id, session.user.id]
    })
    
    return { success: true }
  } catch (e: any) {
    console.error('Error deleting application:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al eliminar la aplicación'
    })
  }
})
