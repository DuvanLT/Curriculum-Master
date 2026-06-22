import OpenAI from 'openai'
import { requireVerifiedUserSession } from '../utils/verified-session'
import { checkUserAIRateLimit } from '../utils/rate-limit'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  checkUserAIRateLimit(userId)
  const body = await readBody(event)
  const { profile: rawProfile, experiences: rawExperiences, locale = 'es' } = body
  const isEn = locale === 'en'

  // Truncate messages to last 30 and cap individual message length
  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-30) : []
  const messages = rawMessages.map((m: any) => ({
    ...m,
    text: typeof m.text === 'string' ? m.text.slice(0, 5000) : ''
  }))

  const profile = rawProfile || { nombre: 'Usuario', titulo: 'Profesional', resumen: '', years: '0', educacion: '' }
  const slimExperiences = (rawExperiences || []).map((e: any) => ({
    cargo: e.cargo, empresa: e.empresa, inicio: e.inicio, fin: e.fin, skills: e.skills
  }))
  const experiences = slimExperiences

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenAI API key missing'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = isEn
    ? `
    You are Ezra, an expert in the tech job market. 
    Your mission is to help the user land their dream job, improve their professional profile, prepare for interviews, and negotiate their salary.

    USER CONTEXT:
    Name: ${profile.nombre}
    Title: ${profile.titulo}
    Summary: ${profile.resumen}
    Years Exp: ${profile.years}
    Education: ${profile.educacion}
    Web/Portfolio: ${profile.web || 'N/A'}

    EXPERIENCES:
    ${JSON.stringify(experiences)}

    INSTRUCTIONS:
    1. Respond in a constructive, motivating, yet realistic and professional manner.
    2. YOU MUST USE the user's profile context and experiences to give personalized advice. If the user asks "who am I" or about their profile, describe it based on the provided information.
    3. If the user asks about interviews, offer to do a "Mock Interview".
    4. If the user asks about salary, ask for more context about the country and role before giving ranges.
    5. Format: ALWAYS RESPOND USING STRUCTURED MARKDOWN. Use bold text to highlight key concepts. For lists, always use new lines and bullets/dashes. Make sure to leave a blank line between paragraphs and before lists so the formatting renders correctly.
    6. Language: You must reply in English.
    7. Never invent facts about the user: do not attribute metrics, achievements, jobs, technologies, or numbers that are not in the profile/experiences above. If something is missing, treat it as an area to improve, not as an existing accomplishment.
  `
    : `
    Eres un Ezra experto en el mercado laboral tecnológico. 
    Tu misión es ayudar al usuario a conseguir el trabajo de sus sueños, mejorar su perfil profesional, preparar entrevistas y negociar su salario.

    CONTEXTO DEL USUARIO:
    Nombre: ${profile.nombre}
    Título: ${profile.titulo}
    Resumen: ${profile.resumen}
    Años Exp: ${profile.years}
    Educación: ${profile.educacion}
    Web/Portafolio: ${profile.web || 'N/A'}

    EXPERIENCIAS:
    ${JSON.stringify(experiences)}

    INSTRUCCIONES:
    1. Responde de forma constructiva, motivadora pero realista y profesional.
    2. USA OBLIGATORIAMENTE el contexto del perfil y las experiencias del usuario para dar consejos personalizados. Si el usuario pregunta "quién soy" o sobre su perfil, descríbelo basándote en la información proporcionada.
    3. Si el usuario te pregunta por entrevistas, ofrece hacer un "Mock Interview".
    4. Si el usuario te pregunta por salario, pide más contexto sobre el país y el rol antes de dar rangos.
    5. Formato: RESPONDE SIEMPRE USANDO MARKDOWN ESTRUCTURADO. Usa negritas para resaltar conceptos clave. Para listas, utiliza siempre líneas nuevas y puntos/guiones. Asegúrate de dejar una línea en blanco entre párrafos y antes de las listas para que el formato se renderice correctamente.
    6. Idioma: Habla en el mismo idioma que el usuario.
    7. Nunca inventes datos sobre el usuario: no le atribuyas métricas, logros, empleos, tecnologías ni números que no estén en el perfil/experiencias de arriba. Si algo falta, trátalo como un área a mejorar, no como un logro existente.
  `

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : (m.role === 'ai' ? 'assistant' : 'user'),
      content: m.text
    }))
  ]

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: apiMessages
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'El coach no pudo generar una respuesta.'
      })
    }

    return {
      text: content
    }
  } catch (e: any) {
    console.error('Coach API Error:', e.message)
    throw createError({
      statusCode: e.statusCode || 500,
      statusMessage: e.statusMessage || 'Error en el servicio de Ezra'
    })
  }
})
