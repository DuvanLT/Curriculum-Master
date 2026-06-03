import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const body = await readBody(event)
    const { company, position, status, date, analysis } = body

  if (!company || !position || !status || !date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios'
    })
  }

  if (String(company).length > 200 || String(position).length > 200 || String(status).length > 50 || String(date).length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Data size limit exceeded for one or more fields.' })
  }

  const db = useDb()
  const id = crypto.randomUUID()

  try {
    await db.execute({
      sql: 'INSERT INTO applications (id, user_id, company, position, status, date, analysis) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, session.user.id, company, position, status, date, analysis ? JSON.stringify(analysis) : null]
    })

    return { id, company, position, status, date, analysis }
  } catch (e: any) {
    console.error('Error creating application:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al guardar la aplicación'
    })
  }
})
