export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { company, position, status, date, analysis, interview_date } = body
  
  if (!company || !position || !status || !date) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Faltan campos obligatorios'
    })
  }

  const db = useDb()
  const id = crypto.randomUUID()
  
  try {
    await db.execute({
      sql: 'INSERT INTO applications (id, user_id, company, position, status, date, analysis, interview_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, session.user.id, company, position, status, date, analysis ? JSON.stringify(analysis) : null, interview_date || null]
    })
    
    return { id, company, position, status, date, analysis, interview_date }
  } catch (e: any) {
    console.error('Error creating application:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al guardar la aplicación'
    })
  }
})
