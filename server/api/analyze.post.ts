import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../utils/verified-session'
import { checkUserAIRateLimit } from '../utils/rate-limit'
import { FREE_TRIAL_LIMITS, isProUser } from '../utils/subscription'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  checkUserAIRateLimit(userId)

  const isPro = isProUser(session.user?.subscription_name)
  if (!isPro) {
    const db = useDb()
    const analysesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM job_analyses WHERE user_id = ?',
      args: [userId]
    })
    const analyses = Number(analysesResult.rows[0]?.count || 0)
    if (analyses >= FREE_TRIAL_LIMITS.MAX_ANALYSES) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Has alcanzado el límite de análisis en el plan gratuito. Mejora a Pro para continuar.'
      })
    }
  }

  const { jd, profile, experiences, locale = 'es' } = await readBody(event)
  const isEn = locale === 'en'

  const jdText = String(jd || '').trim()
  if (!jdText) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Descripción de vacante requerida.'
    })
  }
  if (jdText.length > 15000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Job description is too long (max 15,000 characters).'
    })
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Fatal error.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = isEn
    ? `
    You are an expert in recruitment and ATS systems. Your task is to analyze a job description (JD) and compare it with a candidate's profile.
    
    INSTRUCTIONS:
    1. Identify the most important Hard Skills in the JD.
    2. Compare those skills with the user's profile and experiences.
    3. Calculate a match score from 0 to 100.
    4. Provide a brief analysis and concrete recommendations.
    5. Language: English.

    IMPORTANT: This is NOT just for programmers. It can be for SALES, MARKETING, MEDICINE, CONSTRUCTION, etc. Extract technical/specific skills from ANY field.
  `
    : `
    Eres un experto en reclutamiento y sistemas ATS. Tu tarea es analizar una vacante (JD) y compararla con el perfil de un candidato.
    
    INSTRUCCIONES:
    1. Identifica las Hard Skills (Habilidades Técnicas) más importantes de la vacante.
    2. Compara esas habilidades con el perfil y experiencias del usuario.
    3. Calcula un puntaje de coincidencia (score) de 0 a 100.
    4. Proporciona un análisis breve y recomendaciones concretas.
    5. Idioma: Español.

    IMPORTANTE: Esto NO es solo para programadores. Puede ser para VENTAS, MARKETING, MEDICINA, CONSTRUCCIÓN, etc. Extrae las habilidades técnicas/específicas de CUALQUIER campo.
  `

  const userPrompt = isEn
    ? `
    JOB DESCRIPTION (JD):
    ${jd}

    USER PROFILE:
    ${JSON.stringify({ profile, experiences })}

    RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE SPANISH KEYS):
    {
      "score": 85,
      "company": "Apple",
      "position": "Frontend Developer",
      "keywords_presentes": ["Skill A", "Skill B"],
      "keywords_faltantes": ["Skill C", "Skill D"],
      "hard_skills_jd": [
        { "skill": "Skill Name", "count": 3 } 
      ],
      "analisis": "Your profile has a match...",
      "recomendaciones": ["Improve X", "Learn Y"]
    }
    * Note: 'hard_skills_jd' must be a list of the most mentioned or important skills in the JD with an estimated importance (count).
    * Note: If 'company' or 'position' cannot be detected from the JD, set their value to null.
    * IMPORTANT: The JSON keys MUST remain exactly as shown above (e.g. keywords_presentes, analisis, etc.).
  `
    : `
    VACANTE (JD):
    ${jd}

    PERFIL DEL USUARIO:
    ${JSON.stringify({ profile, experiences })}

    DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
    {
      "score": 85,
      "company": "Apple",
      "position": "Frontend Developer",
      "keywords_presentes": ["Skill A", "Skill B"],
      "keywords_faltantes": ["Skill C", "Skill D"],
      "hard_skills_jd": [
        { "skill": "Nombre Skill", "count": 3 } 
      ],
      "analisis": "Tu perfil tiene una coincidencia...",
      "recomendaciones": ["Mejora X", "Aprende Y"]
    }
    * Nota: 'hard_skills_jd' debe ser una lista de las habilidades más mencionadas o importantes en la vacante con una estimación de su importancia (count).
    * Nota: Si no se puede detectar 'company' o 'position' en la vacante, asigna su valor a null.
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

    // Persist to DB
    const db = useDb()
    await db.execute({
      sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        userId,
        jd,
        (result.company && result.company !== 'N/A' && result.company !== 'null') ? result.company : null,
        (result.position && result.position !== 'N/A' && result.position !== 'null') ? result.position : null,
        result.score || 0,
        content
      ]
    })

    return result
  } catch (e: any) {
    console.error('Analysis API Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al realizar el análisis con IA'
    })
  }
})
