import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const { jd, profile, experiences } = await readBody(event)

  if (!jd) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Descripción de vacante (JD) requerida.'
    })
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key missing'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = `
    Eres un experto en reclutamiento y sistemas ATS. Tu tarea es analizar una vacante (JD) y compararla con el perfil de un candidato.
    
    INSTRUCCIONES:
    1. Identifica las Hard Skills (Habilidades Técnicas) más importantes de la vacante.
    2. Compara esas habilidades con el perfil y experiencias del usuario.
    3. Calcula un puntaje de coincidencia (score) de 0 a 100.
    4. Proporciona un análisis breve y recomendaciones concretas.
    5. Idioma: Español.

    IMPORTANTE: Esto NO es solo para programadores. Puede ser para VENTAS, MARKETING, MEDICINA, CONSTRUCCIÓN, etc. Extrae las habilidades técnicas/específicas de CUALQUIER campo.
  `

  const userPrompt = `
    VACANTE (JD):
    ${jd}

    PERFIL DEL USUARIO:
    ${JSON.stringify({ profile, experiences })}

    DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
    {
      "score": 85,
      "company": "Nombre de la empresa detectada",
      "position": "Nombre del cargo detectado",
      "keywords_presentes": ["Skill A", "Skill B"],
      "keywords_faltantes": ["Skill C", "Skill D"],
      "hard_skills_jd": [
        { "skill": "Nombre Skill", "count": 3 } 
      ],
      "analisis": "Tu perfil tiene una coincidencia...",
      "recomendaciones": ["Mejora X", "Aprende Y"]
    }
    * Nota: 'hard_skills_jd' debe ser una lista de las habilidades más mencionadas o importantes en la vacante con una estimación de su importancia (count).
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
        result.company || 'N/A',
        result.position || 'N/A',
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
