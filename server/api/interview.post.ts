import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { messages, profile, experiences, isFinal } = body

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key missing'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  // If it's the final analysis
  if (isFinal) {
    try {
      const conversationStr = messages.length > 0 
        ? JSON.stringify(messages) 
        : "No hubo conversación; el usuario finalizó inmediatamente."

      const finalPrompt = `
        La entrevista ha terminado. Basándote en la siguiente conversación, genera un resumen de feedback y 3-4 "próximos pasos" (tareas concretas) para que el candidato mejore.
        
        CONVERSACIÓN:
        ${conversationStr}

        DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
        {
          "summary": "Breve resumen del desempeño y áreas de mejora",
          "next_steps": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"]
        }
      `
      console.log('Final Analysis Prompt:', finalPrompt)

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Faster and more reliable for simple JSON extraction
        messages: [{ role: 'system', content: finalPrompt }],
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No se recibió contenido de la IA')
      }
      
      try {
        const result = JSON.parse(content)
        return result
      } catch (jsonErr) {
        throw new Error('La IA devolvió un formato inválido')
      }
    } catch (e: any) {
      throw createError({ 
        statusCode: 500, 
        statusMessage: e.message || 'Error en análisis final' 
      })
    }
  }

  const systemPrompt = `
    Eres un Reclutador Técnico Senior con años de experiencia en empresas de tecnología líderes (tipo FAANG).
    Tu misión es realizar una simulación de entrevista técnica o de comportamiento (behavioral) altamente realista.

    CONTEXTO DEL CANDIDATO:
    Nombre: ${profile?.nombre || 'Candidato'}
    Título: ${profile?.titulo || 'Profesional'}
    Resumen: ${profile?.resumen || ''}
    Años Exp: ${profile?.years || '0'}
    Educación: ${profile?.educacion || ''}

    EXPERIENCIAS:
    ${JSON.stringify(experiences || [])}

    INSTRUCCIONES DE COMPORTAMIENTO:
    1. Mantén un tono profesional, observador y a veces desafiante (como un reclutador real).
    2. Haz preguntas basadas en la experiencia real del candidato. 
    3. Si el candidato da respuestas cortas o vagas, presiona amablemente para obtener detalles (usa el método STAR).
    4. El objetivo NO es solo ser amable, sino evaluar si el candidato es apto.
    5. Realiza una pregunta a la vez.
    6. Idioma: Habla en el mismo idioma que el usuario.
    7. Sé conciso en tus intervenciones para que el flujo de la entrevista sea ágil.
  `

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    }))
  ]

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: apiMessages,
      max_tokens: 500
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'El reclutador no pudo responder en este momento.'
      })
    }

    return {
      text: content
    }
  } catch (e: any) {
    console.error('Interview API Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error in Interview AI'
    })
  }
})
