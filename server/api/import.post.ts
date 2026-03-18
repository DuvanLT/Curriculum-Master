import OpenAI from 'openai'
import { extractText, resolvePDFJSImport } from 'unpdf'

// Polyfill DOMMatrix for Node.js / Vercel Serverless environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class { } as any
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  await requireUserSession(event)

  // Ensure PDF.js is resolved in serverless environments
  await resolvePDFJSImport()

  let text = ''

  // Check if it's a multipart request (file upload)
  const contentType = getHeader(event, 'content-type')
  if (contentType?.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const file = formData?.find(f => f.name === 'file')

    if (file && (file.type === 'application/pdf' || file.name?.endsWith('.pdf'))) {
      try {
        const uint8ArrayData = new Uint8Array(file.data)
        const result = await extractText(uint8ArrayData, { mergePages: true })
        console.log('--- UNPDF RESULT ---')
        console.log(result)
        text = String(result.text || '')
        console.log('--- TEXT OBTAINED ---', text.length, 'chars')
      } catch (pdfError: any) {
        console.error('PDF Parsing Error:', pdfError)
        throw createError({
          statusCode: 422,
          message: `No se pudo leer el archivo PDF: ${pdfError.message || 'Error desconocido'}. Solo se admiten PDFs con texto seleccionable.`
        })
      }
    } else if (file) {
      // Try to read as plain text if not PDF
      text = file.data.toString('utf-8')
    }
  } else {
    // Fallback to plain JSON body text
    const body = await readBody(event)
    text = body.text
  }

  if (!text || text.trim().length < 10) {
    throw createError({
      statusCode: 422,
      message: 'No se pudo extraer texto suficiente del archivo. Este importador solo admite PDFs con texto seleccionable y no procesa PDFs escaneados o basados en imagen.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = `
    Eres un experto en reclutamiento y extracción de datos profesionales. 
    Tu tarea es recibir el texto de un perfil de LinkedIn o de un CV y extraer la información estructurada necesaria para llenar un perfil maestro (Nuxt App).

    IMPORTANTE: 
    - Extrae la mayor cantidad de detalles posible.
    - Si el texto está en inglés, traduce los campos descriptivos al español.
    - El campo 'years' debe ser un número entero (años de experiencia total aproximada).
    - Si el apartado no especifica que es experiencia laboral, no lo incluyas su tiempo en el campo years.
    - Si los apartados de enlace (linekdin,github,web) no inician por https no los incluyas
    - Si no encuentras un apartado, déjalo como string vacío ""
    DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA EXACTA:
    {
      "nombre": "Nombre completo",
      "titulo": "Cargo actual / Título profesional",
      "email_profile": "email",
      "telefono": "teléfono",
      "years": 5,
      "linkedin": "https://www.linkedin.com/in/nombre-usuario/",
      "github": "https://github.com/nombre-usuario",
      "web": "https://www.nombre-usuario.com",
      "educacion": "Título | Institución | Año",
      "resumen": "Resumen profesional de 2-3 líneas",
      "experiences": [
        {
          "cargo": "Nombre del cargo",
          "empresa": "Nombre de la empresa",
          "inicio": "Mes Año",
          "fin": "Mes Año (o 'Actual')",
          "logros": "Descripción resumida de logros y responsabilidades",
          "skills": "Skill1, Skill2, Skill3"
        }
      ]
    }
  `

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `TEXTO A PROCESAR:\n\n${text}` }
      ],
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No se recibió respuesta de la IA')

    const parsed = JSON.parse(content)

    if (parsed?.email && !parsed?.email_profile) {
      parsed.email_profile = parsed.email
    }

    return parsed
  } catch (e: any) {
    console.error('Import Error:', e)
    throw createError({
      statusCode: 500,
      message: 'Error procesando la importación: ' + (e.message || 'Error desconocido')
    })
  }
})
