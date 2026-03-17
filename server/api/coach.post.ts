import OpenAI from 'openai'
import { getUrlContent } from '../utils/fetch-url'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  const body = await readBody(event)
  const { messages, profile: rawProfile, experiences: rawExperiences } = body

  const profile = rawProfile || { nombre: 'Usuario', titulo: 'Profesional', resumen: '', years: '0', educacion: '' }
  const experiences = rawExperiences || []

  let portfolioContent = ''
  if (profile.web) {
    portfolioContent = await getUrlContent(profile.web)
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
    Eres un Ezra experto en el mercado laboral tecnológico. 
    Tu misión es ayudar al usuario a conseguir el trabajo de sus sueños, mejorar su perfil profesional, preparar entrevistas y negociar su salario.

    CONTEXTO DEL USUARIO:
    Nombre: ${profile.nombre}
    Título: ${profile.titulo}
    Resumen: ${profile.resumen}
    Años Exp: ${profile.years}
    Educación: ${profile.educacion}
    Web/Portafolio: ${profile.web || 'N/A'}
    Contenido del Portafolio: ${portfolioContent || 'N/A'}

    EXPERIENCIAS:
    ${JSON.stringify(experiences)}

    INSTRUCCIONES:
    1. Responde de forma constructiva, motivadora pero realista y profesional.
    2. USA OBLIGATORIAMENTE el contexto del perfil y las experiencias del usuario para dar consejos personalizados. Si el usuario pregunta "quién soy" o sobre su perfil, descríbelo basándote en la información proporcionada.
    3. Si el usuario te pregunta por entrevistas, ofrece hacer un "Mock Interview".
    4. Si el usuario te pregunta por salario, pide más contexto sobre el país y el rol antes de dar rangos.
    5. Formato: RESPONDE SIEMPRE USANDO MARKDOWN ESTRUCTURADO. Usa negritas para resaltar conceptos clave. Para listas, utiliza siempre líneas nuevas y puntos/guiones. Asegúrate de dejar una línea en blanco entre párrafos y antes de las listas para que el formato se renderice correctamente.
    6. Idioma: Habla en el mismo idioma que el usuario.
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
