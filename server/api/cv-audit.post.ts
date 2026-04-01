import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const { profile, experiences } = await readBody(event)

  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OpenAI API key missing' })
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  const systemPrompt = `
Eres un experto en reclutamiento y revisión de CVs profesionales. 
Tu tarea es auditar el perfil de un candidato y darle un diagnóstico honesto de la calidad de su CV actual, sin compararlo con ninguna vacante específica.

INSTRUCCIONES:
1. Evalúa la solidez general del perfil (experiencias, habilidades, título, resumen, años de experiencia).
2. Calcula un score de 0 a 100 que refleje qué tan completo, claro y convincente es el CV.
3. Identifica los 3 puntos fuertes del perfil (lo que el candidato ya hace bien).
4. Identifica 3 oportunidades de mejora concretas que la plataforma BringJobs puede ayudarle a resolver.
   - Formula estas oportunidades en positivo y orientadas a la acción de la plataforma.
   - Ejemplos de tono correcto: "Adaptar tu CV automáticamente a cada vacante con IA", "Detectar keywords que te faltan en sectores específicos", "Cuantificar tus logros para pasar filtros ATS más exigentes".
   - NO uses tono negativo ni crítico hacia el candidato. El candidato ya valió por llegar hasta aquí.
5. Da una recomendación ejecutiva en 2 líneas motivadora que conecte el perfil con el potencial de la plataforma.
6. Responde siempre en Español.
`

  const userPrompt = `
PERFIL DEL CANDIDATO:
${JSON.stringify({ profile, experiences })}

DEVUELVE ÚNICAMENTE UN OBJETO JSON CON ESTA ESTRUCTURA:
{
  "score": 72,
  "fortalezas": [
    "Más de 5 años de experiencia en roles de liderazgo técnico claramente documentados.",
    "Stack tecnológico bien definido y actualizado.",
    "Logros cuantificables en 2 de las 3 experiencias listadas."
  ],
  "debilidades": [
    "El resumen profesional es muy genérico y no diferencia al candidato.",
    "Faltan métricas o impacto cuantificable en las experiencias más recientes.",
    "No hay proyectos personales ni portfolio que refuerce el perfil técnico."
  ],
  "recomendacion": "Tu perfil tiene una base sólida pero necesita más especificidad. Prioriza cuantificar tus logros y personalizar tu resumen para cada tipo de vacante."
}
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

    // Persist as a job_analysis with a generic JD so it contributes to ATS score history
    const db = useDb()
    await db.execute({
      sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(),
        userId,
        'Auditoría inicial de CV',
        'Auditoría General',
        'Diagnóstico de perfil',
        result.score || 0,
        JSON.stringify({
          keywords_presentes: result.fortalezas || [],
          keywords_faltantes: result.debilidades || [],
          analisis: result.recomendacion || '',
          recomendaciones: result.debilidades || [],
          hard_skills_jd: []
        })
      ]
    })

    return result
  } catch (e: any) {
    console.error('CV Audit Error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al auditar el CV'
    })
  }
})
