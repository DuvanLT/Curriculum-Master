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
  // Si ya lo usó, cortamos acá: no gastamos una llamada a OpenAI para alguien que vuelve.
  if (Number(row.analyze_used) === 1) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Ya usaste tu análisis gratuito. Crea una cuenta para continuar.'
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
    4. In "analisis", EXPLAIN the score with cause and effect, addressing the candidate in the second person ("you"): say what puts them ahead of or behind other candidates for THIS role, and what the concrete weak point is against the requirements. Be specific, not generic.
    5. In "recomendaciones", give specific, actionable steps focused on CLOSING the gap toward 100%: each recommendation must say exactly what to do and why it brings them closer to the role.
    6. Language: English.

    ANTI-HALLUCINATION: "keywords_presentes" may ONLY contain skills genuinely present in the candidate's profile/experiences. A skill that is in the JD but not in the profile goes in "keywords_faltantes", never in "keywords_presentes". Never invent metrics, achievements, experience, or numbers that are not in the candidate's data.

    IMPORTANT: This is NOT just for programmers. It can be for SALES, MARKETING, MEDICINE, CONSTRUCTION, etc. Extract technical/specific skills from ANY field.
  `
    : `
    Eres un experto en reclutamiento y sistemas ATS. Tu tarea es analizar una vacante (JD) y compararla con el perfil de un candidato.

    INSTRUCCIONES:
    1. Identifica las Hard Skills (Habilidades Técnicas) más importantes de la vacante.
    2. Compara esas habilidades con el perfil y experiencias del usuario.
    3. Calcula un puntaje de coincidencia (score) de 0 a 100.
    4. En "analisis", EXPLICA el puntaje con causa y efecto, hablándole al candidato en segunda persona ("tú"): di qué lo pone por delante o por detrás de otros candidatos para ESTE rol y cuál es el punto débil concreto frente a los requisitos. Sé específico, nada genérico.
    5. En "recomendaciones", da pasos específicos y accionables enfocados en CERRAR la brecha hacia el 100%: cada recomendación debe decir exactamente qué hacer y por qué eso lo acerca al puesto.
    6. Idioma: Español.

    ANTI-ALUCINACIÓN: "keywords_presentes" SOLO puede contener habilidades realmente presentes en el perfil/experiencias del candidato. Una habilidad que está en la vacante pero no en el perfil va en "keywords_faltantes", nunca en "keywords_presentes". Nunca inventes métricas, logros, experiencia ni números que no estén en los datos del candidato.

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
      "analisis": "Your experience with [skill A] and [skill B] puts you ahead of most candidates for this role. The only weak point is [missing requirement], which is listed as a requirement; everything else is directly aligned with what they're looking for.",
      "recomendaciones": ["Add [missing skill] to your profile: with just the fundamentals you close the gap that separates you from the role.", "Put your [key skill] projects front and center: this role wants practical evidence, not just years of experience."]
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
      "analisis": "Tu experiencia con [skill A] y [skill B] te pone por delante de la mayoría de candidatos para este rol. El único punto débil es [requisito faltante], que figura como requisito en la vacante; todo lo demás está directamente alineado con lo que buscan.",
      "recomendaciones": ["Suma [skill faltante] a tu perfil: con los fundamentos básicos ya cierras la brecha que te separa del puesto.", "Pon tus proyectos con [skill clave] al frente: este rol busca evidencia práctica, no solo años de experiencia."]
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

    // Recién ahora que tenemos el resultado consumimos el slot, de forma atómica con el guardado.
    // Si la persona se salió a mitad del análisis, el slot no se quemó sin entregar valor:
    // o queda disponible para reintentar, o el resultado queda guardado y lo ve al volver.
    await db.execute({
      sql: `UPDATE anonymous_trials SET analyze_used = 1, jd_text = ?, analysis_result_json = ? WHERE id = ? AND analyze_used = 0`,
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
