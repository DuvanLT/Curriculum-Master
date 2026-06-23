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
Your task is to audit a candidate's profile and give an honest, specific diagnosis of their current employability, without comparing it to any specific job listing.

INSTRUCTIONS:
1. Evaluate the overall strength of the profile (experiences, skills, title, summary, years of experience).
2. Calculate a score from 0 to 100 reflecting how complete, clear, and competitive the CV is in front of a recruiter.
3. Identify 3 real strengths of the profile. Address the candidate in the second person ("you") and, for each strength, explain not just WHAT they do well but WHY it gives them an edge with recruiters. Be specific; avoid generic phrasing.
   - Tone examples: "Your career path is well structured: clear roles and visible progression.", "You have achievements with concrete numbers, which boosts your credibility with recruiters."
4. Identify the 3 biggest improvement opportunities in the profile. For EACH one it is NOT enough to say what is missing or what is wrong — you MUST also explain THE WHY: the concrete consequence it has with a recruiter (why it costs you, what opportunity you lose, or what doubt it raises). Structure every item as: [what to improve] + [why it matters / what real impact it has]. Be direct and specific, second person ("you"); honest and action-oriented. Keep an empathetic, encouraging tone — many candidates have been job-hunting for months — so state the impact honestly but never in a harsh, dismissive, or alarming way.
   - Tone examples (notice how each names the problem AND its consequence): "Your professional summary is generic: it lists duties instead of communicating which problem you solve. Because of that it's harder for a recruiter to tell you apart in the first few seconds and your profile comes across as less compelling.", "Your recent experiences lack impact metrics. Without numbers (how much you improved, reduced or delivered) the recruiter can't gauge your real contribution and your work reads like a list of tasks, not results."
   - IMPORTANT: Even though the content describes improvement opportunities, the JSON key for this array in your output MUST be exactly "debilidades" — do NOT use "oportunidades", "opportunities", "areas_de_mejora", or any other key name.
5. Write a final 2-line recommendation (field "recomendacion") with value-based urgency: convey that the candidate is just a few adjustments away from a CV that truly competes, and that every point above has a concrete solution inside BringJobs.
   - Tone example: "You're just a few adjustments away from a CV that truly competes. Every point above has a concrete solution inside BringJobs."
6. You must reply in English.

CRITICAL ANTI-HALLUCINATION RULES:
- Base EVERY strength and weakness STRICTLY on data that is actually present in the candidate profile below. Never invent, assume, or extrapolate facts.
- NEVER fabricate metrics, percentages, numbers, achievements, projects, or technologies that are not literally in the profile. If the profile has no quantifiable metrics, you MUST NOT claim it does.
- Do not praise something that is missing. If there are no metrics, that belongs in weaknesses, not strengths.
- The JSON below is an EXAMPLE OF FORMAT ONLY. Do not copy its content; generate strengths and weaknesses derived from THIS specific candidate.
`
    : `
Eres un experto en reclutamiento y revisión de CVs profesionales.
Tu tarea es auditar el perfil de un candidato y darle un diagnóstico honesto y específico de su empleabilidad actual, sin compararlo con ninguna vacante específica.

INSTRUCCIONES:
1. Evalúa la solidez general del perfil (experiencias, habilidades, título, resumen, años de experiencia).
2. Calcula un score de 0 a 100 que refleje qué tan completo, claro y competitivo es el CV ante un reclutador.
3. Identifica 3 fortalezas reales del perfil. Háblale al candidato en segunda persona ("tú") y, en cada fortaleza, explica no solo QUÉ hace bien, sino POR QUÉ eso le da ventaja ante un reclutador. Sé específico; evita frases genéricas.
   - Ejemplos de tono: "Tu trayectoria profesional está bien estructurada: roles claros y progresión visible.", "Tienes logros con números concretos, lo que aumenta tu credibilidad ante reclutadores."
4. Identifica las 3 mayores oportunidades de mejora del perfil. Para CADA una NO basta con decir qué falta o qué está mal — DEBES explicar también EL PORQUÉ: la consecuencia concreta que tiene ante un reclutador (por qué te resta, qué oportunidad pierdes o qué duda genera). Estructura cada punto como: [qué mejorar] + [por qué importa / qué impacto real tiene]. Sé directo y específico, en segunda persona ("tú"); honesto y orientado a la acción. Mantén un tono empático y alentador — muchos candidatos llevan meses buscando empleo —, así que señala el impacto con honestidad pero nunca de forma dura, descalificadora ni alarmista.
   - Ejemplos de tono (fíjate cómo cada uno nombra el problema Y su consecuencia): "Tu resumen profesional es genérico: enumera funciones en vez de comunicar qué problema resuelves tú. Por eso a un reclutador le cuesta diferenciarte en los primeros segundos y tu perfil resulta menos atractivo frente a otros.", "En tus experiencias recientes faltan métricas de impacto. Sin números (cuánto mejoraste, redujiste o entregaste) el reclutador no puede dimensionar tu aporte real y tu trabajo se lee como una lista de tareas, no de resultados."
   - IMPORTANTE: Aunque el contenido describe oportunidades de mejora, la clave JSON de este arreglo en tu respuesta DEBE ser exactamente "debilidades" — NO uses "oportunidades", "opportunities", "areas_de_mejora" ni ningún otro nombre.
5. Escribe una recomendación final de 2 líneas (campo "recomendacion") con tono de urgencia basada en valor: transmite que el candidato está a pocos ajustes de tener un CV que compite en serio y que cada punto anterior tiene solución concreta dentro de BringJobs.
   - Ejemplo de tono: "Estás a pocos ajustes de tener un CV que compite en serio. Cada punto anterior tiene solución concreta dentro de BringJobs."
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
    "Your career path is well structured: clear roles and visible progression.",
    "Your technical skills are aligned with what the market is asking for today.",
    "<a third real strength derived strictly from this candidate's data — do NOT cite numbers unless they literally appear in the profile>"
  ],
  "debilidades": [
    "Your professional summary is generic: it lists duties instead of communicating which problem you solve. Because of that it's harder for a recruiter to tell you apart in the first few seconds and your profile comes across as less compelling.",
    "Your recent experiences lack impact metrics. Without numbers (how much you improved, reduced or delivered) the recruiter can't gauge your real contribution and your work reads like a list of tasks, not results.",
    "You have no visible projects or portfolio. With no concrete evidence of your work, the recruiter has to take your word for it, and against candidates who do show examples it's harder for you to stand out."
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
    "<una tercera fortaleza real derivada estrictamente de los datos de este candidato — NO cites números salvo que aparezcan literalmente en el perfil>"
  ],
  "debilidades": [
    "Tu resumen profesional es genérico: enumera funciones en vez de comunicar qué problema resuelves tú. Por eso a un reclutador le cuesta diferenciarte en los primeros segundos y tu perfil resulta menos atractivo frente a otros.",
    "En tus experiencias recientes faltan métricas de impacto. Sin números (cuánto mejoraste, redujiste o entregaste) el reclutador no puede dimensionar tu aporte real y tu trabajo se lee como una lista de tareas, no de resultados.",
    "No tienes proyectos ni portafolio visibles. Sin evidencia concreta de tu trabajo, el reclutador solo puede confiar en tu palabra, y frente a candidatos que sí muestran ejemplos te cuesta más destacar."
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
