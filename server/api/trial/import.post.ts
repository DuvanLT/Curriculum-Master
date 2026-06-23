import OpenAI from 'openai'
import { extractText, resolvePDFJSImport } from 'unpdf'
import { getOrCreateAnonId, getClientIpHash, assertTrialIpQuota } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'
import { cvNotReadableError } from '../../utils/cv-import'

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class { } as any
}

function normalizeExperienceDescription(raw: unknown) {
  if (typeof raw !== 'string') return ''

  const sanitized = raw.replace(/\r/g, '\n').trim()
  if (!sanitized) return ''

  let lines = sanitized
    .split(/\n+/)
    .map(line => line.replace(/^[\-\*\u2022\s]+/, '').trim())
    .filter(Boolean)

  if (lines.length === 1) {
    lines = sanitized
      .split(/(?<=[\.\!\?])\s+|;\s+/)
      .map(line => line.replace(/^[\-\*\u2022\s]+/, '').trim())
      .filter(Boolean)
  }

  if (lines.length === 1) {
    lines = sanitized
      .split(/,\s+(?=[A-Z0-9])/)
      .map(line => line.replace(/^[\-\*\u2022\s]+/, '').trim())
      .filter(Boolean)
  }

  const limited = lines.slice(0, 4).join('\n')
  return limited
}

function hasProjectSignals(text: string) {
  return /(projects?|portfolio|personal projects?|academic projects?|side projects?|open source|hackathon|capstone|tesis|proyecto[s]?|freelance)/i.test(text)
}

function normalizeImportedEntry(exp: any) {
  return {
    ...exp,
    type: exp?.type === 'project' ? 'project' : 'work',
    logros: normalizeExperienceDescription(exp?.logros)
  }
}

function dedupeEntries(entries: any[]) {
  const seen = new Set<string>()

  return entries.filter((entry) => {
    const key = [
      entry.type === 'project' ? 'project' : 'work',
      String(entry.cargo || '').trim().toLowerCase(),
      String(entry.empresa || '').trim().toLowerCase(),
      String(entry.inicio || '').trim().toLowerCase()
    ].join('|')

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()

  // Persisted per-IP backstop: clearing the bj_anon_id cookie to obtain a
  // fresh trial does not reset credits — the IP is capped across anon ids.
  await assertTrialIpQuota(db, event, anonId)

  // Si ya importó, cortamos antes de leer el PDF y llamar a OpenAI.
  const existingTrial = await db.execute({
    sql: 'SELECT import_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  const existingTrialRow = existingTrial.rows[0] as any
  if (existingTrialRow && Number(existingTrialRow.import_used) === 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu importación gratuita. Crea una cuenta para continuar.'
    })
  }

  await resolvePDFJSImport()

  let text = ''
  let locale = 'es'

  const contentType = getHeader(event, 'content-type')
  if (contentType?.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const file = formData?.find(f => f.name === 'file')
    const localeField = formData?.find(f => f.name === 'locale')
    if (localeField) {
      locale = localeField.data.toString()
    }

    if (file && file.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File is too large (max 5MB).'
      })
    }

    if (file && (file.type === 'application/pdf' || file.name?.endsWith('.pdf'))) {
      try {
        const uint8ArrayData = new Uint8Array(file.data)
        const result = await extractText(uint8ArrayData, { mergePages: true })
        text = String(result.text || '')
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw cvNotReadableError(`No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`)
      }
    } else if (file) {
      text = file.data.toString('utf-8')
    }
  } else {
    const body = await readBody(event)
    text = body.text
    if (body.locale) {
      locale = body.locale
    }
  }

  const isEn = locale === 'en'

  if (!text || text.trim().length < 10) {
    throw cvNotReadableError('No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.')
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = isEn
    ? `
You are an expert in recruitment and professional data extraction.
Your task is to receive text from a LinkedIn profile or a CV and extract the structured information needed to populate a master profile.

IMPORTANT:
- Extract as much detail as possible.
- If the text is in Spanish, translate the descriptive fields to English.
- The "years" field must be an integer representing the approximate total years of work experience.
- Distinguish between work experience and projects.
- Use "type": "work" for real work experience at a company, contract, freelance, or professional role.
- Use "type": "project" for personal, academic, portfolio projects, hackathons, non-work internships, or one-off initiatives.
- If an entry is not clearly work experience, do not add its time to the "years" field.
- The "logros" field for each experience should have enough context and preferably exceed 300 characters when the source info allows it.
- You can use between 2 and 4 lines as a format guide, but prioritize richness of context over a strict number of line breaks.
- Each block of "logros" must provide context, responsibility, stack, action, deliverable, or result.
- Do not return poor single-sentence descriptions if the source text allows extracting more detail.
- If you don't find a section, leave it as an empty string "".

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
{
  "nombre": "Full name",
  "titulo": "Current position / Professional title",
  "ubicacion": "City, Country or professional location",
  "email_profile": "email",
  "telefono": "phone number",
  "years": 5,
  "linkedin": "https://www.linkedin.com/in/username/",
  "otros": "https://professional_page/username or any other relevant professional link",
  "web": "https://www.username.com",
  "educacion": "Short legacy summary of education",
  "educations": [
    {
      "titulo": "Name of the study",
      "institucion": "Institution",
      "inicio": "Month Year",
      "fin": "Month Year or Present",
      "descripcion": "Focus, degree, emphasis or additional context"
    }
  ],
  "resumen": "Professional summary of 2-3 lines",
  "experiences": [
    {
      "type": "work",
      "cargo": "Job title",
      "empresa": "Company name or project name",
      "inicio": "Month Year",
      "fin": "Month Year (or 'Present')",
      "logros": "Descriptive block with context, action, stack and result. Ideally over 300 characters.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`
    : `
Eres un experto en reclutamiento y extraccion de datos profesionales.
Tu tarea es recibir el texto de un perfil de LinkedIn o de un CV y extraer la informacion estructurada necesaria para llenar un perfil maestro.

IMPORTANTE:
- Extrae la mayor cantidad de detalles posible.
- Si el texto esta en ingles, traduce los campos descriptivos al espanol.
- El campo "years" debe ser un numero entero con los anos de experiencia laboral total aproximada.
- Distingue entre experiencia laboral y proyecto.
- Usa "type": "work" cuando sea experiencia laboral real en empresa, contrato, freelance o rol profesional.
- Usa "type": "project" cuando sea proyecto personal, academico, portafolio, hackathon, practica no laboral o iniciativa puntual.
- Si una entrada no es claramente experiencia laboral, no sumes su tiempo al campo "years".
- El campo "logros" de cada experiencia debe tener suficiente contexto y preferiblemente superar 300 caracteres cuando la informacion fuente lo permita.
- Puedes usar entre 2 y 4 lineas como guia de formato, pero prioriza riqueza de contexto sobre el numero estricto de saltos de linea.
- Cada bloque de "logros" debe aportar contexto, responsabilidad, stack, accion, entregable o resultado.
- No devuelvas descripciones pobres de una sola frase si el texto fuente permite extraer mas detalle.
- Si no encuentras un apartado, dejalo como string vacio "".

DEVUELVE UNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA EXACTA:
{
  "nombre": "Nombre completo",
  "titulo": "Cargo actual / Titulo profesional",
  "ubicacion": "Ciudad, Pais o ubicacion profesional",
  "email_profile": "email",
  "telefono": "telefono",
  "years": 5,
  "linkedin": "https://www.linkedin.com/in/nombre-usuario/",
  "otros": "https://pagina_profesional/nombre-usuario o cualquier otro enlace profesional relevante",
  "web": "https://www.nombre-usuario.com",
  "educacion": "Resumen corto legacy de educacion",
  "educations": [
    {
      "titulo": "Nombre del estudio",
      "institucion": "Institucion",
      "inicio": "Mes Ano",
      "fin": "Mes Ano o Actual",
      "descripcion": "Enfoque, grado, enfasis o contexto adicional"
    }
  ],
  "resumen": "Resumen profesional de 2-3 lineas",
  "experiences": [
    {
      "type": "work",
      "cargo": "Nombre del cargo",
      "empresa": "Nombre de la empresa o nombre del proyecto",
      "inicio": "Mes Ano",
      "fin": "Mes Ano (o 'Actual')",
      "logros": "Bloque descriptivo con contexto, accion, stack y resultado. Idealmente superior a 300 caracteres.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `TEXTO A PROCESAR:\n\n${text}` }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No se recibio respuesta de la IA')

    const parsed = JSON.parse(content)

    if (parsed?.email && !parsed?.email_profile) {
      parsed.email_profile = parsed.email
    }

    if (parsed?.github && !parsed?.otros) {
      parsed.otros = parsed.github
    }

    parsed.ubicacion = parsed?.ubicacion || ''

    if (Array.isArray(parsed?.educations)) {
      parsed.educations = parsed.educations.map((edu: any) => ({
        ...edu,
        titulo: edu?.titulo || '',
        institucion: edu?.institucion || '',
        inicio: edu?.inicio || '',
        fin: edu?.fin || '',
        descripcion: edu?.descripcion || ''
      }))
    } else {
      parsed.educations = []
    }

    if (!parsed.educacion && parsed.educations.length) {
      parsed.educacion = parsed.educations
        .map((edu: any) => [edu.titulo, edu.institucion, edu.fin || edu.inicio].filter(Boolean).join(' | '))
        .join('\n')
    }

    if (Array.isArray(parsed?.experiences)) {
      parsed.experiences = parsed.experiences.map((exp: any) => normalizeImportedEntry(exp))
    }

    const alreadyHasProjects = Array.isArray(parsed?.experiences) && parsed.experiences.some((exp: any) => exp?.type === 'project')

    if (!alreadyHasProjects && hasProjectSignals(text)) {
      const truncatedText = text.slice(0, 6000)
      const projectResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
Eres un extractor especializado en proyectos dentro de CVs.
Tu tarea es leer el texto y devolver SOLO proyectos relevantes que aparezcan en secciones como Projects, Personal Projects, Portfolio, Open Source, Hackathons, Freelance, Academic Projects, Thesis o equivalentes.

REGLAS:
- Devuelve solamente entradas de tipo "project".
- Si el CV menciona proyecto personal, proyecto academico, open source, portafolio, freelance puntual o hackathon, incluyelo.
- No confundas empleos formales con proyectos.
- El campo "logros" debe ser descriptivo y, cuando haya suficiente informacion, idealmente superar 300 caracteres.
- Si no encuentras proyectos claros, devuelve "experiences": [].

DEVUELVE UNICAMENTE JSON:
{
  "experiences": [
    {
      "type": "project",
      "cargo": "Rol o aporte en el proyecto",
      "empresa": "Nombre del proyecto",
      "inicio": "Mes Ano",
      "fin": "Mes Ano o Actual",
      "logros": "Bloque descriptivo con contexto, accion, stack, entregable e impacto cuando aplique.",
      "skills": "Skill1, Skill2, Skill3"
    }
  ]
}
`
          },
          {
            role: 'user',
            content: `TEXTO A PROCESAR:\n\n${truncatedText}`
          }
        ],
        response_format: { type: 'json_object' }
      })

      const projectContent = projectResponse.choices[0]?.message?.content
      if (projectContent) {
        const parsedProjects = JSON.parse(projectContent)
        const importedProjects = Array.isArray(parsedProjects?.experiences)
          ? parsedProjects.experiences.map((exp: any) => normalizeImportedEntry({ ...exp, type: 'project' }))
          : []

        parsed.experiences = dedupeEntries([
          ...(Array.isArray(parsed.experiences) ? parsed.experiences : []),
          ...importedProjects
        ])
      }
    }

    const { educations: parsedEducations, experiences: parsedExperiences, ...profileFields } = parsed

    // Recién ahora que la extracción terminó consumimos el crédito de importación,
    // de forma atómica con el guardado del perfil. Si la persona se salió durante el
    // procesamiento, el crédito no se quemó sin entregar nada: o queda disponible para
    // reintentar, o el perfil queda guardado y lo ve al volver.
    await db.execute({
      sql: `INSERT INTO anonymous_trials (id, ip_hash, import_used, profile_json, experiences_json, educations_json)
            VALUES (?, ?, 1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              import_used = 1,
              ip_hash = excluded.ip_hash,
              profile_json = excluded.profile_json,
              experiences_json = excluded.experiences_json,
              educations_json = excluded.educations_json
            WHERE anonymous_trials.import_used = 0`,
      args: [
        anonId,
        getClientIpHash(event),
        JSON.stringify(profileFields),
        JSON.stringify(parsedExperiences || []),
        JSON.stringify(parsedEducations || [])
      ]
    })

    return parsed
  } catch (e: any) {
    console.error('Trial Import Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Error procesando la importacion: ' + (e.message || 'Error desconocido')
    })
  }
})


