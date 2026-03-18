import OpenAI from 'openai'
import { extractText, resolvePDFJSImport } from 'unpdf'

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class {} as any
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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)

  await resolvePDFJSImport()

  let text = ''

  const contentType = getHeader(event, 'content-type')
  if (contentType?.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const file = formData?.find(f => f.name === 'file')

    if (file && (file.type === 'application/pdf' || file.name?.endsWith('.pdf'))) {
      try {
        const uint8ArrayData = new Uint8Array(file.data)
        const result = await extractText(uint8ArrayData, { mergePages: true })
        console.log('--- UNPDF RESULT ---')
        console.log(result)
        text = String(result.text || '')
        console.log('--- TEXT OBTAINED ---', text.length, 'chars')
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw createError({
          statusCode: 422,
          message: `No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`
        })
      }
    } else if (file) {
      text = file.data.toString('utf-8')
    }
  } else {
    const body = await readBody(event)
    text = body.text
  }

  if (!text || text.trim().length < 10) {
    throw createError({
      statusCode: 422,
      message: 'No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = `
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
  "github": "https://github.com/nombre-usuario",
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
            content: `TEXTO A PROCESAR:\n\n${text}`
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

    return parsed
  } catch (e: any) {
    console.error('Import Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Error procesando la importacion: ' + (e.message || 'Error desconocido')
    })
  }
})
