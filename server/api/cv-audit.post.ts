import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../utils/verified-session'
import { checkUserAIRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  checkUserAIRateLimit(userId)
  const { profile, experiences, locale = 'es' } = await readBody(event)
  const isEn = locale === 'en'

  // Validate input size
  const inputSize = JSON.stringify({ profile, experiences }).length
  if (inputSize > 30000) {
    throw createError({ statusCode: 400, statusMessage: 'Input data is too large (max 30,000 characters).' })
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
    "More than 5 years of clearly documented technical leadership experience.",
    "Well-defined and updated technology stack.",
    "Quantifiable achievements in 2 of the 3 listed experiences."
  ],
  "debilidades": [
    "The professional summary is very generic and does not differentiate the candidate.",
    "Missing metrics or quantifiable impact in the most recent experiences.",
    "No personal projects or portfolio to reinforce the technical profile."
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
    "Más de 5 años de experiencia en roles de liderazgo técnico claramente documentados.",
    "Stack tecnológico bien definido y actualizado.",
    "Logros cuantificables en 2 de las 3 experiencias listadas."
  ],
  "debilidades": [
    "El resumen profesional es muy genérico y no diferencia al candidato.",
    "Faltan métricas o impacto cuantificable en las experiencias más recientes.",
    "No hay proyectos personales ni portfolio que refuerce el perfil técnico."
  ],
  "recomendacion": "Tu perfil tiene una base sólida pero necesita más especificidad. Prioriza cuantificar tus logros y personalizar tu resumen para cada tipo de vacante."
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

    // Persist as a job_analysis with a generic JD so it contributes to ATS score history
    const db = useDb()
    await db.execute({
      sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        userId,
        'Auditoría inicial de CV',
        'Auditoría General',
        'Diagnóstico de perfil',
        result.score || 0,
        JSON.stringify({
          keywords_presentes: result.fortalezas || [],
          keywords_faltantes: result.debilidades || [],
          analisis: result.recomendacion || '',
          recomendaciones: result.debilidades || [],
          hard_skills_jd: []
        })
      ]
    })

    return result
  } catch (e: any) {
    console.error('CV Audit Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al auditar el CV'
    })
  }
})
