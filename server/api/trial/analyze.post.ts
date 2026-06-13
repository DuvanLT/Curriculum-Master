import OpenAI from 'openai'
import { getOrCreateAnonId } from '../../utils/anon-trial'
import { checkAnonAIRateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const anonId = getOrCreateAnonId(event)
  checkAnonAIRateLimit(event)

  const db = useDb()
  const existing = await db.execute({
    sql: 'SELECT analyze_used FROM anonymous_trials WHERE id = ?',
    args: [anonId]
  })
  const row = existing.rows[0] as any
  if (!row) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero debes importar tu CV.'
    })
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

  const claim = await db.execute({
    sql: 'UPDATE anonymous_trials SET analyze_used = 1 WHERE id = ? AND analyze_used = 0',
    args: [anonId]
  })
  if (claim.rowsAffected === 0) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu análisis gratuito. Crea una cuenta para continuar.'
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

  const slimProfile = {
    titulo: profile?.titulo || '',
    years: profile?.years || '0',
    skills: profile?.skills || '',
    resumen: profile?.resumen || ''
  }
  const slimExperiences = Array.isArray(experiences)
    ? experiences.map((e: any) => ({ cargo: e.cargo, empresa: e.empresa, skills: e.skills, logros: typeof e.logros === 'string' ? e.logros.slice(0, 300) : '' }))
    : []

  const userPrompt = isEn
    ? `
    JOB DESCRIPTION (JD):
    ${jd}

    USER PROFILE:
    ${JSON.stringify({ profile: slimProfile, experiences: slimExperiences })}

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
    ${JSON.stringify({ profile: slimProfile, experiences: slimExperiences })}

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

    await db.execute({
      sql: `UPDATE anonymous_trials SET jd_text = ?, analysis_result_json = ? WHERE id = ?`,
      args: [jd, content, anonId]
    })

    return result
  } catch (e: any) {
    console.error('Trial Analysis Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al realizar el análisis con IA'
    })
  }
})
