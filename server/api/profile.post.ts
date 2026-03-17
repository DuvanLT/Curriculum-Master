import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { profile, experiences } = body
  const db = useDb()

  // Check if new email is already taken by another user
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
    args: [profile.email, userId]
  })

  if (existingUser.rows.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El correo electrónico ya está en uso por otra cuenta.'
    })
  }

  // Update profile
  await db.execute({
    sql: `UPDATE users SET 
      email = ?,
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
      profile.email,
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

  // Update session to keep it in sync with the new email/name
  await setUserSession(event, {
    user: {
      ...session.user,
      email: profile.email,
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
