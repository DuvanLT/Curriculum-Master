import OpenAI from 'openai'
import { requireVerifiedUserSession } from '../utils/verified-session'
import { checkUserAIRateLimit } from '../utils/rate-limit'
import { FREE_TRIAL_LIMITS, isProUser } from '../utils/subscription'

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
  checkUserAIRateLimit(userId)

  const isPro = isProUser(session.user?.subscription_name)
  if (!isPro) {
    const db = useDb()
    const cvsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM generated_cvs WHERE user_id = ?',
      args: [userId]
    })
    const cvs = Number(cvsResult.rows[0]?.count || 0)
    if (cvs >= FREE_TRIAL_LIMITS.MAX_CVS) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Has alcanzado el límite de CVs generados en el plan gratuito. Mejora a Pro para continuar.'
      })
    }
  }
  const body = await readBody(event)
  const { profile, experiences, jd, locale = 'es' } = body
  const isEn = locale === 'en'

  // Validate JD length
  const jdText = typeof jd === 'string' ? jd.trim() : ''
  if (jdText.length > 15000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Job description is too long (max 15,000 characters).'
    })
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

  const systemPrompt = isEn
    ? `
You are an expert in CV optimization for ATS systems and recruiters.
Your goal is to adapt the user's CV to a specific job description without inventing experience, context, or metrics.

CRITICAL RULES:
1. First analyze the JD and detect responsibilities, tools, seniority, and expected results.
2. Then evaluate each user experience and decide how relevant it is for the vacancy.
3. Respect the type of each entry:
   - "work" = formal work experience.
   - "project" = personal, academic, or freelance project. Never present a project as a formal job.
4. Do not just copy the profile text. Rewrite each achievement to connect it with the vacancy using the available context.
5. Use the STAR methodology realistically:
   - Situation/Task: clarify the context or problem.
   - Action: explain the candidate's action or contribution.
   - Result: express the impact.
6. Only use percentages, figures, or volumes when there is explicit evidence in the profile, experiences, or portfolio.
7. Never invent numbers or exaggerate. Avoid impossible improvements like "reduced times by 100%".
8. If there is no reliable numerical data, use realistic qualitative results without figures.
9. Include relevant keywords from the JD only when they honestly fit the candidate's real experience.
10. Highlight the most relevant experiences more and lower the weight of the less related ones.
11. When the type is "project", focus the writing on scope, stack, problem solved, deliverable, and learning applied to the role.
12. When the type is "work", focus the writing on responsibility, collaboration, results, and business context.
13. The tone must be professional, executive, and concrete. ALWAYS write in the FIRST PERSON (e.g., "Developed", "Implemented"). Do not use third person. Avoid cliches and empty words.
14. Return ONLY structured JSON.
15. Language: English.
16. If a portfolio/web URL is provided, use it only as a declarative reference of the profile and do not invent evidence from it.
17. For technical skills (top_skills), STRICTLY use the skills explicitly provided by the user in their profile and experiences. Do not invent or add skills they haven't mentioned.
`
    : `
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
13. El tono debe ser profesional, ejecutivo y concreto. Redacta SIEMPRE en PRIMERA PERSONA (ej. "Desarrollé", "Implementé", "Lideré"). NO uses tercera persona ni forma impersonal ("Se desarrolló", "Implementó"). Evita cliches y palabras vacias.
14. Devuelve unicamente JSON estructurado.
15. Traduce o manten el idioma segun la vacante: si la vacante esta en ingles, responde en ingles; si esta en espanol, responde en espanol.
16. Si se proporciona una URL de portafolio/web, usala solo como referencia declarativa del perfil y no inventes evidencia a partir de ella.
17. Para las habilidades tecnicas (top_skills), utiliza ESTRICTAMENTE las habilidades que el usuario ya ha especificado en su perfil y experiencias. No inventes ni agregues habilidades que no esten en sus datos reales.
`

  const userPrompt = isEn
    ? `
PROFILE DATA:
${JSON.stringify(profile)}

NORMALIZED EXPERIENCES:
${JSON.stringify(normalizedExperiences)}

PORTFOLIO/WEB:
${profile?.web || 'N/A'}

TARGET VACANCY (JD):
${jd || 'N/A (Do a general high-quality optimization if there is no JD)'}

ADDITIONAL OUTPUT INSTRUCTIONS:
- Ensure all achievements in "logros_optimizados" are written in the FIRST PERSON (e.g., "Developed...", "Led..."). Do NOT use third person.
- Order "experiences" from highest to lowest relevance for the vacancy.
- For each experience, analyze if it really contributes to the vacancy and adapt the focus.
- Keep and return the "type" field in each experience.
- Each "logros_optimizados" must sound specific to the vacancy, not be a simple copy of the original text.
- If data is missing for a metric, do not invent percentages.
- Use a MAXIMUM of 3 achievements per experience to keep the CV concise.
- Each achievement must be short and direct (minimum 3 lines, maximum 5 lines, 5 if the experience is relevant). Do not write long paragraphs.

RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE (KEEP THE SPANISH KEYS):
{
  "summary": "Optimized professional summary (3-4 lines)",
  "optimized_title": "Professional title adjusted to the vacancy",
  "experiences": [
    {
      "id": "same original id",
      "type": "work or project",
      "relevance_score": 0, 
      "relevance_reason": "brief explanation of why this experience is or isn't relevant to the vacancy",
      "cargo": "optimized title",
      "empresa": "company name",
      "focus_for_role": "specific focus with which this experience should be presented for the vacancy",
      "logros_optimizados": ["list of 2-4 adapted and realistic achievements"],
      "skills_sugeridas": ["list of key skills for this position"],
      "metricas_confiables": ["short list of metrics that can be supported by the given info, or empty if none"]
    }
  ],
  "top_skills": ["list of the 10 most important skills for this role, extracted STRICTLY from the ones the user already specified in their data"],
  "advice": ["3-4 key tips to stand out in this selection process"],
  "next_steps": ["3-4 concrete to-do tasks to improve the profile or application"]
}
* IMPORTANT: The JSON keys MUST remain exactly as shown above (e.g. logros_optimizados, skills_sugeridas, cargo, empresa, etc.).
`
    : `
DATOS DEL PERFIL:
${JSON.stringify(profile)}

EXPERIENCIAS NORMALIZADAS:
${JSON.stringify(normalizedExperiences)}

PORTAFOLIO/WEB:
${profile?.web || 'N/A'}

VACANTE OBJETIVO (JD):
${jd || 'N/A (Haz una optimizacion general de alta calidad si no hay JD)'}

INSTRUCCIONES ADICIONALES DE SALIDA:
- Asegúrate de que todos los logros en "logros_optimizados" estén redactados en PRIMERA PERSONA (ej. "Desarrollé...", "Lideré..."). NO uses tercera persona ni formas impersonales.
- Ordena "experiences" de mayor a menor relevancia para la vacante.
- Para cada experiencia, analiza si realmente aporta a la vacante y adapta el enfoque.
- Conserva y devuelve el campo "type" en cada experiencia.
- Cada "logros_optimizados" debe sonar especifico para la vacante, no ser una simple copia del texto original.
- Si faltan datos para una metrica, no inventes porcentajes.
- Usa MÁXIMO 2 logros (viñetas) por cada experiencia para mantener el CV conciso.
- Cada logro debe ser corto y directo (minimo 3  lineas y máximo 5 líneas si la expereincia o proyecto es muy relevante). No escribas párrafos largos.

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
  "top_skills": ["lista de las 10 skills mas importantes para este rol, extraidas ESTRICTAMENTE de las que el usuario ya declaro en sus datos"],
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
          cargo: sourceExp?.cargo || aiExp?.cargo || '',
          empresa: sourceExp?.empresa || aiExp?.empresa || '',
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

    // Persist generated CV for dashboard history
    try {
      const db = useDb()
      // Extract company and position from JD text (structured format: "Empresa: X", "Título: Y")
      let cvCompany = 'General'
      let cvPosition = result.optimized_title || profile?.titulo || 'CV Optimizado'
      if (jd) {
        const companyMatch = jd.match(/Empresa:\s*(.+)/i)
        if (companyMatch) cvCompany = companyMatch[1].trim()
        const titleMatch = jd.match(/T[ií]tulo:\s*(.+)/i)
        if (titleMatch) cvPosition = titleMatch[1].trim()
      }
      await db.execute({
        sql: 'INSERT INTO generated_cvs (id, user_id, company, position, jd_text, cv_json) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          crypto.randomUUID(),
          userId,
          cvCompany,
          cvPosition,
          jd || null,
          JSON.stringify(result)
        ]
      })
    } catch (cvErr) {
      console.error('Error persisting generated CV:', cvErr)
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
