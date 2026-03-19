import OpenAI from 'openai'
import { requireVerifiedUserSession } from '../utils/verified-session'

const MAX_STEPS = 40

function splitAchievements(raw: unknown) {
  if (typeof raw !== 'string') return []

  return raw
    .split(/\r?\n|\u2022|\u00B7|;/)
    .map(item => item.replace(/^[\-\*\u2022\s]+/, '').trim())
    .filter(Boolean)
}

function normalizeExperienceType(value: unknown) {
  return value === 'project' ? 'project' : 'work'
}

function findSourceExperience(aiExp: any, sourceExperiences: any[]) {
  if (aiExp?.id) {
    const directMatch = sourceExperiences.find((exp: any) => String(exp.id) === String(aiExp.id))
    if (directMatch) return directMatch
  }

  const aiCargo = String(aiExp?.cargo || '').trim().toLowerCase()
  const aiEmpresa = String(aiExp?.empresa || '').trim().toLowerCase()

  return sourceExperiences.find((exp: any) => {
    const expCargo = String(exp?.cargo || '').trim().toLowerCase()
    const expEmpresa = String(exp?.empresa || '').trim().toLowerCase()
    return expCargo === aiCargo && expEmpresa === aiEmpresa
  }) || null
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { profile, experiences, jd } = body

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Key missing in server configuration'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const normalizedExperiences = Array.isArray(experiences)
    ? experiences.map((exp: any) => ({
      id: exp.id,
      type: exp.type === 'project' ? 'project' : 'work',
      cargo: exp.cargo || '',
      empresa: exp.empresa || '',
      inicio: exp.inicio || '',
      fin: exp.fin || '',
      skills: Array.isArray(exp.skills) ? exp.skills : [],
      logros_originales: typeof exp.logros === 'string' ? exp.logros : '',
      logros_desglosados: splitAchievements(exp.logros)
    }))
    : []

  const systemPrompt = `
Eres un experto en optimizacion de CVs para sistemas ATS y reclutadores.
Tu objetivo es adaptar el CV del usuario a una vacante especifica sin inventar experiencia, contexto ni metricas.

REGLAS CRITICAS:
1. Primero analiza la vacante y detecta responsabilidades, herramientas, seniority y resultados esperados.
2. Luego evalua cada experiencia del usuario y decide que tan relevante es para la vacante.
3. Respeta el tipo de cada entrada:
   - "work" = experiencia laboral.
   - "project" = proyecto personal, academico, freelance puntual o iniciativa de portafolio.
   Nunca presentes un proyecto como si fuera empleo formal.
4. No copies ni maquilles el mismo texto del perfil. Reescribe cada logro para conectarlo con la vacante usando el contexto disponible.
5. Usa metodologia STAR de forma realista:
   - Situation/Task: deja claro el contexto o problema.
   - Action: explica la accion o contribucion del candidato.
   - Result: expresa el impacto.
6. Solo usa porcentajes, cifras o volumenes cuando haya evidencia explicita en el perfil, experiencias o portafolio.
7. Nunca inventes numeros ni exageres. Evita mejoras imposibles o sospechosas como "reduje tiempos en 100%".
8. Si no hay dato numerico confiable, usa resultados cualitativos verosimiles sin cifra.
9. Incluye palabras clave relevantes de la vacante solo cuando encajen de forma honesta con la experiencia real del candidato.
10. Destaca mas las experiencias mas relevantes y baja el peso de las menos relacionadas.
11. Cuando el tipo sea "project", enfoca la redaccion en alcance, stack, problema resuelto, entregable y aprendizaje aplicado al rol.
12. Cuando el tipo sea "work", enfoca la redaccion en responsabilidad, colaboracion, resultados y contexto de negocio.
13. El tono debe ser profesional, ejecutivo y concreto. Evita cliches y palabras vacias.
14. Devuelve unicamente JSON estructurado.
15. Traduce o manten el idioma segun la vacante: si la vacante esta en ingles, responde en ingles; si esta en espanol, responde en espanol.
16. Si se proporciona una URL de portafolio/web, usala solo como referencia declarativa del perfil y no inventes evidencia a partir de ella.
`

  const userPrompt = `
DATOS DEL PERFIL:
${JSON.stringify(profile)}

EXPERIENCIAS NORMALIZADAS:
${JSON.stringify(normalizedExperiences)}

PORTAFOLIO/WEB:
${profile?.web || 'N/A'}

VACANTE OBJETIVO (JD):
${jd || 'N/A (Haz una optimizacion general de alta calidad si no hay JD)'}

INSTRUCCIONES ADICIONALES DE SALIDA:
- Ordena "experiences" de mayor a menor relevancia para la vacante.
- Para cada experiencia, analiza si realmente aporta a la vacante y adapta el enfoque.
- Conserva y devuelve el campo "type" en cada experiencia.
- Cada "logros_optimizados" debe sonar especifico para la vacante, no ser una simple copia del texto original.
- Si faltan datos para una metrica, no inventes porcentajes.
- Usa maximo 2 logros cuando la relevancia sea baja o media-baja.
- Usa 3 o 4 logros solo cuando la experiencia sea claramente relevante.

DEVUELVE UN OBJETO JSON CON ESTA ESTRUCTURA:
{
  "summary": "Resumen profesional optimizado (3-4 lineas)",
  "optimized_title": "Titulo profesional ajustado a la vacante",
  "experiences": [
    {
      "id": "mismo id original",
      "type": "work o project",
      "relevance_score": 0,
      "relevance_reason": "explicacion breve de por que esta experiencia si o no es relevante para la vacante",
      "cargo": "titulo optimizado",
      "empresa": "nombre empresa",
      "focus_for_role": "enfoque especifico con el que se debe presentar esta experiencia para la vacante",
      "logros_optimizados": ["lista de 2-4 logros adaptados y realistas"],
      "skills_sugeridas": ["lista de skills clave para esta posicion"],
      "metricas_confiables": ["lista corta de metricas que si se pueden sostener con la informacion dada, o vacio si no hay"]
    }
  ],
  "top_skills": ["lista de las 10 skills mas importantes para este rol"],
  "advice": ["3-4 consejos clave para destacar en este proceso de seleccion"],
  "next_steps": ["3-4 tareas concretas de to-do para mejorar el perfil o postulacion"]
}
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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

    if (Array.isArray(result?.experiences)) {
      result.experiences = result.experiences.map((aiExp: any) => {
        const sourceExp = findSourceExperience(aiExp, normalizedExperiences)

        return {
          ...sourceExp,
          ...aiExp,
          id: aiExp?.id || sourceExp?.id || crypto.randomUUID(),
          type: normalizeExperienceType(aiExp?.type || sourceExp?.type),
          cargo: aiExp?.cargo || sourceExp?.cargo || '',
          empresa: aiExp?.empresa || sourceExp?.empresa || '',
          inicio: aiExp?.inicio || sourceExp?.inicio || '',
          fin: aiExp?.fin || sourceExp?.fin || '',
          logros_optimizados: Array.isArray(aiExp?.logros_optimizados)
            ? aiExp.logros_optimizados.filter(Boolean)
            : [],
          skills_sugeridas: Array.isArray(aiExp?.skills_sugeridas)
            ? aiExp.skills_sugeridas.filter(Boolean)
            : [],
          metricas_confiables: Array.isArray(aiExp?.metricas_confiables)
            ? aiExp.metricas_confiables.filter(Boolean)
            : []
        }
      })
    } else {
      result.experiences = []
    }

    if (result.next_steps && Array.isArray(result.next_steps)) {
      const db = useDb()
      const countResult = await db.execute({
        sql: 'SELECT COUNT(*) as total FROM next_steps WHERE user_id = ?',
        args: [userId]
      })
      const currentCount = Number(countResult.rows?.[0]?.total ?? 0)
      const remainingSlots = Math.max(0, MAX_STEPS - currentCount)

      for (const stepText of result.next_steps.slice(0, remainingSlots)) {
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
