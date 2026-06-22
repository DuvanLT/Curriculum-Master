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

CRITICAL ANTI-HALLUCINATION RULES:
- Base EVERY strength and weakness STRICTLY on data that is actually present in the candidate profile below. Never invent, assume, or extrapolate facts.
- NEVER fabricate metrics, percentages, numbers, achievements, projects, or technologies that are not literally in the profile. If the profile has no quantifiable metrics, you MUST NOT claim it does.
- Do not praise something that is missing. If there are no metrics, that belongs in weaknesses, not strengths.
- The JSON below is an EXAMPLE OF FORMAT ONLY. Do not copy its content; generate strengths and weaknesses derived from THIS specific candidate.
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

REGLAS CRÍTICAS ANTI-ALUCINACIÓN:
- Basa CADA fortaleza y debilidad EXCLUSIVAMENTE en datos que estén realmente presentes en el perfil del candidato de abajo. Nunca inventes, supongas ni extrapoles datos.
- NUNCA inventes métricas, porcentajes, números, logros, proyectos o tecnologías que no estén literalmente en el perfil. Si el perfil no tiene métricas cuantificables, NO afirmes que las tiene.
- No elogies algo que falta. Si no hay métricas, eso va en debilidades, no en fortalezas.
- El JSON de abajo es SOLO UN EJEMPLO DE FORMATO. No copies su contenido; genera fortalezas y debilidades derivadas de ESTE candidato específico.
`

  const userPrompt = isEn
    ? `
CANDIDATE PROFILE:
${JSON.stringify({ profile, experiences })}

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
{
  "score": 72,
  "fortalezas": [
    "<strength derived strictly from the candidate's real data>",
    "<strength derived strictly from the candidate's real data>",
    "<strength derived strictly from the candidate's real data>"
  ],
  "debilidades": [
    "<improvement opportunity derived strictly from the candidate's real data>",
    "<improvement opportunity derived strictly from the candidate's real data>",
    "<improvement opportunity derived strictly from the candidate's real data>"
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
    "<fortaleza derivada estrictamente de los datos reales del candidato>",
    "<fortaleza derivada estrictamente de los datos reales del candidato>",
    "<fortaleza derivada estrictamente de los datos reales del candidato>"
  ],
  "debilidades": [
    "<oportunidad de mejora derivada estrictamente de los datos reales del candidato>",
    "<oportunidad de mejora derivada estrictamente de los datos reales del candidato>",
    "<oportunidad de mejora derivada estrictamente de los datos reales del candidato>"
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
