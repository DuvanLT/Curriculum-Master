import OpenAI from 'openai'
import { requireVerifiedUserSession } from '../utils/verified-session'
import { checkUserAIRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  checkUserAIRateLimit(session.user.id)
  const body = await readBody(event)
  const { profile, experiences, isFinal, locale = 'es' } = body
  const isEn = locale === 'en'

  // Truncate messages to last 50 and cap each at 3000 chars
  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-50) : []
  const messages = rawMessages.map((m: any) => ({
    ...m,
    text: typeof m.text === 'string' ? m.text.slice(0, 3000) : ''
  }))

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key missing'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const buildSpeech = async (input: string) => {
    const speechResponse = await openai.audio.speech.create({
      model: config.openaiTtsModel || 'tts-1-hd',
      voice: config.openaiTtsVoice || 'nova',
      input,
      speed: 0.92,
      response_format: 'mp3'
    })

    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer())

    return {
      audio: audioBuffer.toString('base64'),
      audioMimeType: 'audio/mpeg'
    }
  }

  // If it's the final analysis
  if (isFinal) {
    try {
      const conversationStr = messages.length > 0
        ? JSON.stringify(messages)
        : "No hubo conversación; el usuario finalizó inmediatamente."

      const finalPrompt = isEn
        ? `
        The interview has ended. Based on the following conversation, generate a feedback summary and 3-4 "next steps" (concrete tasks) for the candidate to improve.
        
        CONVERSATION:
        ${conversationStr}

        RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE EXACT SPANISH KEYS):
        {
          "summary": "Brief summary of performance and areas for improvement",
          "next_steps": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
        }
      `
        : `
        La entrevista ha terminado. Basándote en la siguiente conversación, genera un resumen de feedback y 3-4 "próximos pasos" (tareas concretas) para que el candidato mejore.
        
        CONVERSACIÓN:
        ${conversationStr}

        DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
        {
          "summary": "Breve resumen del desempeño y áreas de mejora",
          "next_steps": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"]
        }
      `

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

  const systemPrompt = isEn
    ? `
    You are a Senior Technical Recruiter with years of experience at leading tech companies (like FAANG).
    Your mission is to conduct a highly realistic technical or behavioral interview simulation.

    CANDIDATE CONTEXT:
    Name: ${profile?.nombre || 'Candidate'}
    Title: ${profile?.titulo || 'Professional'}
    Summary: ${profile?.resumen || ''}
    Years Exp: ${profile?.years || '0'}
    Education: ${profile?.educacion || ''}

    EXPERIENCES:
    ${JSON.stringify(experiences || [])}

    BEHAVIORAL INSTRUCTIONS:
    1. Maintain a professional, observant, and sometimes challenging tone (like a real recruiter).
    2. Ask questions based on the candidate's real experience. 
    3. If the candidate gives short or vague answers, politely press for details (use the STAR method).
    4. The goal is NOT just to be nice, but to assess if the candidate is suitable.
    5. Ask one question at a time.
    6. Language: You must speak in English.
    7. Keep your interventions concise so the interview flows smoothly.
  `
    : `
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

    let speech = null

    try {
      speech = await buildSpeech(content)
    } catch (ttsError) {
      console.error('Interview TTS Error:', ttsError)
    }

    return {
      text: content,
      audio: speech?.audio || null,
      audioMimeType: speech?.audioMimeType || null
    }
  } catch (e: any) {
    console.error('Interview API Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error in Interview AI'
    })
  }
})
