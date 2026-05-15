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

import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const db = useDb()

  const userResult = await db.execute({
    sql: 'SELECT email_profile, name, titulo, ubicacion, resumen, telefono, linkedin, github, web, educacion, years, idiomas FROM users WHERE id = ?',
    args: [userId]
  })

  const user = userResult.rows[0]
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  let educations: any[] = []

  try {
    const availableColumns = await getEducationSchema(db)
    const userIdColumn = pickColumn(availableColumns, ['user_id', 'userId'])

    if (userIdColumn) {
      const idColumn = pickColumn(availableColumns, ['id'])
      const titleColumn = pickColumn(availableColumns, ['titulo', 'title', 'degree', 'name'])
      const institutionColumn = pickColumn(availableColumns, ['institucion', 'institution', 'school', 'academy'])
      const startColumn = pickColumn(availableColumns, ['inicio', 'start_date', 'start', 'fecha_inicio', 'from_date'])
      const endColumn = pickColumn(availableColumns, ['fin', 'end_date', 'end', 'fecha_fin', 'to_date'])
      const descriptionColumn = pickColumn(availableColumns, ['descripcion', 'description', 'details'])

      const educationResult = await db.execute({
        sql: `
          SELECT
            ${idColumn ? idColumn : 'rowid'} AS id,
            ${titleColumn ? titleColumn : "''"} AS titulo,
            ${institutionColumn ? institutionColumn : "''"} AS institucion,
            ${startColumn ? startColumn : "''"} AS inicio,
            ${endColumn ? endColumn : "''"} AS fin,
            ${descriptionColumn ? descriptionColumn : "''"} AS descripcion
          FROM educations
          WHERE ${userIdColumn} = ?
          ORDER BY rowid DESC
        `,
        args: [userId]
      })

      educations = educationResult.rows.map((row: any) => ({
        id: row.id || '',
        titulo: row.titulo || '',
        institucion: row.institucion || '',
        inicio: row.inicio || '',
        fin: row.fin || '',
        descripcion: row.descripcion || ''
      }))
    }
  } catch (error) {
    console.error('Error loading educations:', error)
  }

  const expResult = await db.execute({
    sql: 'SELECT id, empresa, cargo, inicio, fin, logros, skills, type FROM experiences WHERE user_id = ?',
    args: [userId]
  })

  const experiences = expResult.rows.map(row => ({
    ...row,
    type: row.type === 'project' ? 'project' : 'work',
    skills: row.skills ? JSON.parse(row.skills as string) : []
  }))

  return {
    profile: {
      email_profile: user.email_profile || '',
      nombre: user.name || '',
      titulo: user.titulo || '',
      ubicacion: user.ubicacion || '',
      resumen: user.resumen || '',
      telefono: user.telefono || '',
      linkedin: user.linkedin || '',
      otros: user.github || '',
      web: user.web || '',
      educacion: buildEducationSummary(educations) || user.educacion || '',
      years: user.years || '',
      idiomas: user.idiomas ? JSON.parse(user.idiomas as string) : []
    },
    educations,
    experiences
  }
})
