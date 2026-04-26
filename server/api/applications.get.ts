import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const db = useDb()
  
  try {
    const apps = await db.execute({
      sql: 'SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC',
      args: [session.user.id]
    })
    
    return apps.rows
  } catch (e: any) {
    console.error('Error fetching applications:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al obtener aplicaciones'
    })
  }
})
