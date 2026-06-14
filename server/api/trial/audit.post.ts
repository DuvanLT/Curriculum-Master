import OpenAI from 'openai'
import { getOrCreateAnonId } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()
  const existing = await db.execute({
    sql: 'SELECT profile_json, audit_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  const row = existing.rows[0] as any
  if (!row || !row.profile_json) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero debes importar tu CV.'
    })
  }

  const { profile, experiences, locale = 'es' } = await readBody(event)
  const isEn = locale === 'en'

  // Validate profile and experiences types
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'profile debe ser un objeto.'
    })
  }
  if (!Array.isArray(experiences)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'experiences debe ser un arreglo.'
    })
  }

  // Validate input size
  const inputSize = JSON.stringify({ profile, experiences }).length
  if (inputSize > 30000) {
    throw createError({ statusCode: 400, statusMessage: 'Input data is too large (max 30,000 characters).' })
  }

  const claim = await db.execute({
    sql: 'UPDATE anonymous_trials SET audit_used = 1 WHERE id = ? AND audit_used = 0',
    args: [anonId]
  })
  if (claim.rowsAffected === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu auditoría gratuita. Crea una cuenta para continuar.'
    })
  }

  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OpenAI API key missing' })
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  const systemPrompt = isEn
    ? `
You are an expert in recruitment and professional CV review.
Your task is to audit a candidate's profile and provide an honest diagnosis of their current CV quality, without comparing it to any specific job listing.

INSTRUCTIONS:
1. Evaluate the overall strength of the profile (experiences, skills, title, summary, years of experience).
2. Calculate a score from 0 to 100 reflecting how complete, clear, and compelling the CV is.
3. Identify the 3 strengths of the profile (what the candidate already does well).
4. Identify 3 concrete areas for improvement that the BringJobs platform can help solve.
   - Phrase these opportunities positively and action-oriented.
   - Examples: "Automatically adapt your CV to each job listing using AI", "Detect missing keywords for specific industries", "Quantify your achievements to pass stricter ATS filters".
   - DO NOT use negative or critical tone.
   - IMPORTANT: Even though you should frame these as opportunities/improvement areas in their *content* (positive, action-oriented tone), the JSON key for this array in your output MUST be exactly "debilidades" — do NOT use "oportunidades", "opportunities", "areas_de_mejora", or any other key name.
5. Provide a 2-line executive recommendation that connects the profile with the platform's potential.
6. You must reply in English.
`
    : `
Eres un experto en reclutamiento y revisión de CVs profesionales.
Tu tarea es auditar el perfil de un candidato y darle un diagnóstico honesto de la calidad de su CV actual, sin compararlo con ninguna vacante específica.

INSTRUCCIONES:
1. Evalúa la solidez general del perfil (experiencias, habilidades, título, resumen, años de experiencia).
2. Calcula un score de 0 a 100 que refleje qué tan completo, claro y convincente es el CV.
3. Identifica los 3 puntos fuertes del perfil (lo que el candidato ya hace bien).
4. Identifica 3 oportunidades de mejora concretas que la plataforma BringJobs puede ayudarle a resolver.
   - Formula estas oportunidades en positivo y orientadas a la acción de la plataforma.
   - Ejemplos de tono correcto: "Adaptar tu CV automáticamente a cada vacante con IA", "Detectar keywords que te faltan en sectores específicos", "Cuantificar tus logros para pasar filtros ATS más exigentes".
   - NO uses tono negativo ni crítico hacia el candidato. El candidato ya valió por llegar hasta aquí.
   - IMPORTANTE: Aunque debes formular el CONTENIDO de estos elementos como oportunidades de mejora (en positivo, orientado a la acción), la clave JSON de este arreglo en tu respuesta DEBE ser exactamente "debilidades" — NO uses "oportunidades", "opportunities", "areas_de_mejora" ni ningún otro nombre.
5. Da una recomendación ejecutiva en 2 líneas motivadora que conecte el perfil con el potencial de la plataforma.
6. Responde siempre en Español.
`

  const userPrompt = isEn
    ? `
CANDIDATE PROFILE:
${JSON.stringify({ profile, experiences })}

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
{
  "score": 72,
  "fortalezas": [
    "Clearly documented professional experience with well-defined roles.",
    "Solid and up-to-date skill set aligned with the target industry.",
    "Quantifiable achievements present in the listed experiences."
  ],
  "debilidades": [
    "The professional summary is generic and does not differentiate the candidate.",
    "Missing metrics or quantifiable impact in recent experiences.",
    "No personal projects or portfolio to reinforce the professional profile."
  ],
  "recomendacion": "Your profile has a solid foundation but needs more specificity. Prioritize quantifying your achievements and customizing your summary for each type of job."
}
`
    : `
PERFIL DEL CANDIDATO:
${JSON.stringify({ profile, experiences })}

DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
{
  "score": 72,
  "fortalezas": [
    "Experiencia profesional claramente documentada con roles bien definidos.",
    "Stack tecnologico o set de habilidades solido y actualizado.",
    "Logros cuantificables presentes en las experiencias listadas."
  ],
  "debilidades": [
    "El resumen profesional es muy generico y no diferencia al candidato.",
    "Faltan metricas o impacto cuantificable en las experiencias mas recientes.",
    "No hay proyectos personales ni portfolio que refuerce el perfil profesional."
  ],
  "recomendacion": "Tu perfil tiene una base solida pero necesita mas especificidad. Prioriza cuantificar tus logros y personalizar tu resumen para cada tipo de vacante."
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    const result = JSON.parse(content)

    await db.execute({
      sql: `UPDATE anonymous_trials SET profile_json = ?, experiences_json = ?, audit_result_json = ? WHERE id = ?`,
      args: [
        JSON.stringify(profile || {}),
        JSON.stringify(experiences || []),
        JSON.stringify(result),
        anonId
      ]
    })

    return result
  } catch (e: any) {
    console.error('Trial CV Audit Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al auditar el CV'
    })
  }
})
