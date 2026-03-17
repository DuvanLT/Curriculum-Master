export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDb()

  try {
    const { rows } = await db.execute({
      sql: `SELECT * FROM job_analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      args: [userId]
    })

    return rows.map(row => ({
      ...row,
      analysis: JSON.parse(row.analysis_json as string)
    }))
  } catch (e) {
    console.error('Error fetching analysis history:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al obtener historial de análisis'
    })
  }
})
