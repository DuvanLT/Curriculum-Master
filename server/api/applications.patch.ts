import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const body = await readBody(event)
  const { id, status, interview_date } = body
  
  if (!id || !status) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID y Estado requeridos'
    })
  }

  const db = useDb()
  
  try {
    await db.execute({
      sql: 'UPDATE applications SET status = ?, interview_date = ? WHERE id = ? AND user_id = ?',
      args: [status, interview_date || null, id, session.user.id]
    })
    
    return { success: true }
  } catch (e: any) {
    console.error('Error updating application:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al actualizar la aplicación'
    })
  }
})
