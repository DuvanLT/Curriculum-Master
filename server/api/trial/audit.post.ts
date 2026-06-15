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
Your task is to audit a candidate's profile and give an honest, specific diagnosis of their current employability, without comparing it to any specific job listing.

INSTRUCTIONS:
1. Evaluate the overall strength of the profile (experiences, skills, title, summary, years of experience).
2. Calculate a score from 0 to 100 reflecting how complete, clear, and competitive the CV is in front of a recruiter.
3. Identify 3 real strengths of the profile. Address the candidate in the second person ("you") and, for each strength, explain not just WHAT they do well but WHY it gives them an edge with recruiters. Be specific; avoid generic phrasing.
   - Tone examples: "Your career path is well structured: clear roles and visible progression.", "You have achievements with concrete numbers, which boosts your credibility with recruiters."
4. Identify the 3 biggest improvement opportunities in the profile. Be direct and specific: name the real gap and explain why a recruiter cares, in the second person ("you"). Honest, action-oriented tone; neither generic nor overly soft, but never disparaging.
   - Tone examples: "Your professional summary is generic. It needs to communicate which problem you solve that no one else solves the same way.", "Your recent experiences lack impact metrics: recruiters want to know how much you improved, how much you reduced, how much you delivered."
   - IMPORTANT: Even though the content describes improvement opportunities, the JSON key for this array in your output MUST be exactly "debilidades" — do NOT use "oportunidades", "opportunities", "areas_de_mejora", or any other key name.
5. Write a final 2-line recommendation (field "recomendacion") with value-based urgency: convey that the candidate is just a few adjustments away from a CV that truly competes, and that every point above has a concrete solution inside BringJobs.
   - Tone example: "You're just a few adjustments away from a CV that truly competes. Every point above has a concrete solution inside BringJobs."
6. You must reply in English.
`
    : `
Eres un experto en reclutamiento y revisión de CVs profesionales.
Tu tarea es auditar el perfil de un candidato y darle un diagnóstico honesto y específico de su empleabilidad actual, sin compararlo con ninguna vacante específica.

INSTRUCCIONES:
1. Evalúa la solidez general del perfil (experiencias, habilidades, título, resumen, años de experiencia).
2. Calcula un score de 0 a 100 que refleje qué tan completo, claro y competitivo es el CV ante un reclutador.
3. Identifica 3 fortalezas reales del perfil. Háblale al candidato en segunda persona ("tú") y, en cada fortaleza, explica no solo QUÉ hace bien, sino POR QUÉ eso le da ventaja ante un reclutador. Sé específico; evita frases genéricas.
   - Ejemplos de tono: "Tu trayectoria profesional está bien estructurada: roles claros y progresión visible.", "Tienes logros con números concretos, lo que aumenta tu credibilidad ante reclutadores."
4. Identifica las 3 mayores oportunidades de mejora del perfil. Sé directo y específico: nombra la brecha real y explica por qué le importa a un reclutador, en segunda persona ("tú"). Tono honesto y orientado a la acción; ni genérico ni excesivamente suave, pero nunca despectivo.
   - Ejemplos de tono: "Tu resumen profesional es genérico. Necesita comunicar qué problema resuelves tú, que nadie más resuelve igual.", "En tus experiencias recientes faltan métricas de impacto: los reclutadores quieren saber cuánto mejoraste, cuánto redujiste, cuánto entregaste."
   - IMPORTANTE: Aunque el contenido describe oportunidades de mejora, la clave JSON de este arreglo en tu respuesta DEBE ser exactamente "debilidades" — NO uses "oportunidades", "opportunities", "areas_de_mejora" ni ningún otro nombre.
5. Escribe una recomendación final de 2 líneas (campo "recomendacion") con tono de urgencia basada en valor: transmite que el candidato está a pocos ajustes de tener un CV que compite en serio y que cada punto anterior tiene solución concreta dentro de BringJobs.
   - Ejemplo de tono: "Estás a pocos ajustes de tener un CV que compite en serio. Cada punto anterior tiene solución concreta dentro de BringJobs."
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
    "Your career path is well structured: clear roles and visible progression.",
    "Your technical skills are aligned with what the market is asking for today.",
    "You have achievements with concrete numbers, which boosts your credibility with recruiters."
  ],
  "debilidades": [
    "Your professional summary is generic. It needs to communicate which problem you solve that no one else solves the same way.",
    "Your recent experiences lack impact metrics: how much you improved, how much you reduced, how much you delivered.",
    "You don't yet have visible projects or a portfolio that set you apart from the candidate pile."
  ],
  "recomendacion": "You're just a few adjustments away from a CV that truly competes. Every point above has a concrete solution inside BringJobs."
}
`
    : `
PERFIL DEL CANDIDATO:
${JSON.stringify({ profile, experiences })}

DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
{
  "score": 72,
  "fortalezas": [
    "Tu trayectoria profesional está bien estructurada: roles claros y progresión visible.",
    "Tus habilidades técnicas están alineadas con lo que el mercado pide hoy.",
    "Tienes logros con números concretos, lo que aumenta tu credibilidad ante reclutadores."
  ],
  "debilidades": [
    "Tu resumen profesional es genérico. Necesita comunicar qué problema resuelves tú, que nadie más resuelve igual.",
    "En tus experiencias recientes faltan métricas de impacto: cuánto mejoraste, cuánto redujiste, cuánto entregaste.",
    "Aún no tienes proyectos o portafolio visibles que te diferencien de la pila de candidatos."
  ],
  "recomendacion": "Estás a pocos ajustes de tener un CV que compite en serio. Cada punto anterior tiene solución concreta dentro de BringJobs."
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
