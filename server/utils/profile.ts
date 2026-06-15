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

export interface SaveUserProfileInput {
  profile: any
  educations: any[]
  experiences: any[]
}

/**
 * Persists a user's profile, educations, and experiences. Used by
 * `/api/profile` (authenticated edits) and by the signup migration of
 * `anonymous_trials` data.
 */
export async function saveUserProfile(db: ReturnType<typeof useDb>, userId: string, input: SaveUserProfileInput) {
  const profile = input.profile || {}
  const educations = Array.isArray(input.educations) ? input.educations : []
  const experiences = Array.isArray(input.experiences) ? input.experiences : []

  const educationSummary = educations.length
    ? buildEducationSummary(educations)
    : (profile.educacion || '')
  const availableColumns = await getEducationSchema(db)
  const userIdColumn = pickColumn(availableColumns, ['user_id', 'userId'])
  const statements: Array<{ sql: string; args?: any[] }> = []

  statements.push({
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
      years = ?,
      idiomas = ?
      WHERE id = ?`,
    args: [
      profile.email_profile,
      profile.nombre,
      profile.titulo,
      profile.ubicacion,
      profile.resumen,
      profile.telefono,
      profile.linkedin,
      profile.otros || profile.github || '',
      profile.web,
      educationSummary,
      profile.years,
      JSON.stringify(
        Array.isArray(profile.idiomas)
          ? profile.idiomas
          : (typeof profile.idiomas === 'string'
            ? profile.idiomas.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [])
      ),
      userId
    ]
  })

  if (userIdColumn) {
    statements.push({
      sql: `DELETE FROM educations WHERE ${userIdColumn} = ?`,
      args: [userId]
    })

    if (educations.length > 0) {
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
          statements.push({
            sql: `INSERT INTO educations (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            args: values
          })
        }
      }
    }
  }

  statements.push({
    sql: 'DELETE FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  for (const exp of experiences) {
    statements.push({
      sql: `INSERT INTO experiences (id, user_id, empresa, cargo, inicio, fin, logros, skills, type, link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        exp.id || uuidv4(),
        userId,
        exp.empresa,
        exp.cargo,
        exp.inicio,
        exp.fin || null,
        exp.logros || null,
        JSON.stringify(exp.skills || []),
        exp.type === 'project' ? 'project' : 'work',
        exp.link || null
      ]
    })
  }

  await db.batch(statements, 'write')
}
