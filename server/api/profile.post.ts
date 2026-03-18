import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { profile, experiences } = body
  const db = useDb()

  await db.execute({
    sql: `UPDATE users SET
      email_profile = ?,
      name = ?,
      titulo = ?,
      resumen = ?,
      telefono = ?,
      linkedin = ?,
      github = ?,
      web = ?,
      educacion = ?,
      years = ?
      WHERE id = ?`,
    args: [
      profile.email_profile,
      profile.nombre,
      profile.titulo,
      profile.resumen,
      profile.telefono,
      profile.linkedin,
      profile.github,
      profile.web,
      profile.educacion,
      profile.years,
      userId
    ]
  })

  // Keep the session display name aligned with the master profile.
  await setUserSession(event, {
    user: {
      ...session.user,
      name: profile.nombre
    }
  })

  // Update experiences (Delete and Re-insert for simplicity in this MVP)
  await db.execute({
    sql: 'DELETE FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  if (experiences && experiences.length > 0) {
    for (const exp of experiences) {
      await db.execute({
        sql: `INSERT INTO experiences (id, user_id, empresa, cargo, inicio, fin, logros, skills)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          exp.id || uuidv4(),
          userId,
          exp.empresa,
          exp.cargo,
          exp.inicio,
          exp.fin || null,
          exp.logros || null,
          JSON.stringify(exp.skills || [])
        ]
      })
    }
  }

  return { success: true }
})
