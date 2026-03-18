import { v4 as uuidv4 } from 'uuid'

function buildEducationSummary(educations: any[]) {
  return educations
    .map(edu => [edu.titulo, edu.institucion, edu.fin || edu.inicio].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('\n')
}

function pickColumn(availableColumns: Set<string>, candidates: string[]) {
  return candidates.find(column => availableColumns.has(column)) || null
}

async function getEducationSchema(db: ReturnType<typeof useDb>) {
  const result = await db.execute('PRAGMA table_info(educations)')
  const columns = result.rows
    .map((row: any) => String(row.name || row.column_name || '').trim())
    .filter(Boolean)

  return new Set(columns)
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { profile, educations, experiences } = body
  const db = useDb()

  const educationSummary = Array.isArray(educations)
    ? buildEducationSummary(educations)
    : (profile.educacion || '')

  await db.execute({
    sql: `UPDATE users SET
      email_profile = ?,
      name = ?,
      titulo = ?,
      ubicacion = ?,
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
      profile.ubicacion,
      profile.resumen,
      profile.telefono,
      profile.linkedin,
      profile.github,
      profile.web,
      educationSummary,
      profile.years,
      userId
    ]
  })

  await setUserSession(event, {
    user: {
      ...session.user,
      name: profile.nombre
    }
  })

  try {
    const availableColumns = await getEducationSchema(db)
    const userIdColumn = pickColumn(availableColumns, ['user_id', 'userId'])

    if (userIdColumn) {
      await db.execute({
        sql: `DELETE FROM educations WHERE ${userIdColumn} = ?`,
        args: [userId]
      })

      if (Array.isArray(educations) && educations.length > 0) {
        const idColumn = pickColumn(availableColumns, ['id'])
        const titleColumn = pickColumn(availableColumns, ['titulo', 'title', 'degree', 'name'])
        const institutionColumn = pickColumn(availableColumns, ['institucion', 'institution', 'school', 'academy'])
        const startColumn = pickColumn(availableColumns, ['inicio', 'start_date', 'start', 'fecha_inicio', 'from_date'])
        const endColumn = pickColumn(availableColumns, ['fin', 'end_date', 'end', 'fecha_fin', 'to_date'])
        const descriptionColumn = pickColumn(availableColumns, ['descripcion', 'description', 'details'])

        for (const edu of educations) {
          const columns: string[] = []
          const values: any[] = []

          if (idColumn) {
            columns.push(idColumn)
            values.push(edu.id || uuidv4())
          }

          columns.push(userIdColumn)
          values.push(userId)

          if (titleColumn) {
            columns.push(titleColumn)
            values.push(edu.titulo || '')
          }

          if (institutionColumn) {
            columns.push(institutionColumn)
            values.push(edu.institucion || '')
          }

          if (startColumn) {
            columns.push(startColumn)
            values.push(edu.inicio || null)
          }

          if (endColumn) {
            columns.push(endColumn)
            values.push(edu.fin || null)
          }

          if (descriptionColumn) {
            columns.push(descriptionColumn)
            values.push(edu.descripcion || null)
          }

          if (columns.length > 1) {
            await db.execute({
              sql: `INSERT INTO educations (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
              args: values
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error saving educations:', error)
  }

  await db.execute({
    sql: 'DELETE FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  if (experiences && experiences.length > 0) {
    for (const exp of experiences) {
      await db.execute({
        sql: `INSERT INTO experiences (id, user_id, empresa, cargo, inicio, fin, logros, skills, type)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          exp.id || uuidv4(),
          userId,
          exp.empresa,
          exp.cargo,
          exp.inicio,
          exp.fin || null,
          exp.logros || null,
          JSON.stringify(exp.skills || []),
          exp.type === 'project' ? 'project' : 'work'
        ]
      })
    }
  }

  return { success: true }
})
