export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDb()

  // Fetch user profile
  const userResult = await db.execute({
    sql: 'SELECT email, name, titulo, resumen, telefono, linkedin, github, web, educacion, years FROM users WHERE id = ?',
    args: [userId]
  })

  const user = userResult.rows[0]
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  // Fetch experiences
  const expResult = await db.execute({
    sql: 'SELECT id, empresa, cargo, inicio, fin, logros, skills FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  const experiences = expResult.rows.map(row => ({
    ...row,
    skills: row.skills ? JSON.parse(row.skills as string) : []
  }))

  return {
    profile: {
      email: user.email || '',
      nombre: user.name || '',
      titulo: user.titulo || '',
      resumen: user.resumen || '',
      telefono: user.telefono || '',
      linkedin: user.linkedin || '',
      github: user.github || '',
      web: user.web || '',
      educacion: user.educacion || '',
      years: user.years || ''
    },
    experiences
  }
})
