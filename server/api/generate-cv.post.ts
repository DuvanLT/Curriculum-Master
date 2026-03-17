import OpenAI from 'openai'
import { getUrlContent } from '../utils/fetch-url'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { profile, experiences, jd } = body

  let portfolioContent = ''
  if (profile.web) {
    try {
      const parsedUrl = new URL(profile.web)
      // Solo permitir http y https para evitar file:// o gopher://
      if (['http:', 'https:'].includes(parsedUrl.protocol)) {
        portfolioContent = await getUrlContent(parsedUrl.href)
      } else {
        console.warn('URL de portafolio no permitida:', profile.web)
      }
    } catch (e) {
      console.warn('URL de portafolio inválida:', profile.web)
    }
  }

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Key missing in server configuration'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = `
    Eres un experto en optimización de CVs para sistemas ATS (Applicant Tracking Systems) y reclutadores técnicos.
    Tu objetivo es reescribir la información del usuario para que sea impactante, profesional y esté alineada con una vacante específica.
    
    REGLAS CRÍTICAS:
    1. Usa la "Fórmula de Google" para los logros: [Verbo de Acción fuerte] + [Resultado medible] + [Contexto/Métrica].
    2. Evita clichés y palabras vacías.
    3. Asegúrate de incluir palabras clave relevantes de la vacante (JD) de forma natural.
    4. El tono debe ser profesional, ejecutivo y técnico.
    5. Devuelve la información en formato JSON estructurado.
    6. Traduce o mantén el idioma según el contexto (si la vacante es en inglés, el CV debe estar en inglés; si es en español, en español).
    7. Si se proporciona información del portafolio/web, úsala para enriquecer el perfil y los logros.
  `

  const userPrompt = `
    DATOS DEL PERFIL:
    ${JSON.stringify(profile)}

    EXPERIENCIAS:
    ${JSON.stringify(experiences)}

    PORTAFOLIO/WEB (Información extraída del enlace):
    ${portfolioContent || 'N/A'}

    VACANTE OBJETIVO (JD):
    ${jd || 'N/A (Haz una optimización general de alta calidad si no hay JD)'}

    POR FAVOR, DEVUELVE UN OBJETO JSON CON LA SIGUIENTE ESTRUCTURA:
    {
      "summary": "Resumen profesional optimizado (aprox 3-4 líneas)",
      "optimized_title": "Título profesional ajustado a la vacante",
      "experiences": [
        {
          "id": "mismo id original",
          "cargo": "título optimizado",
          "empresa": "nombre empresa",
          "logros_optimizados": ["lista de 3-4 logros usando la fórmula de Google"],
          "skills_sugeridas": ["lista de skills clave para esta posición"]
        }
      ],
      "top_skills": ["lista de las 10 skills más importantes para este rol"],
      "advice": ["3-4 consejos clave para destacar en este proceso de selección"],
      "next_steps": ["3-4 tareas concretas de to-do para mejorar el perfil o postulación"]
    }
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Or gpt-3.5-turbo if cost is an issue, but user asked for "openai"
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'OpenAI returned an empty response'
      })
    }

    const result = JSON.parse(content)

    // Save next steps to DB
    if (result.next_steps && Array.isArray(result.next_steps)) {
      const db = useDb()
      for (const stepText of result.next_steps) {
        try {
          await db.execute({
            sql: 'INSERT INTO next_steps (id, user_id, text, completed) VALUES (?, ?, ?, 0)',
            args: [crypto.randomUUID(), userId, stepText]
          })
        } catch (dbErr) {
          console.error('Error saving next step:', dbErr)
        }
      }
    }

    return result
  } catch (e: any) {
    console.error('OpenAI Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: e.message || 'Error generating AI CV'
    })
  }
})
