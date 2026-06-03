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

const PRESENT_TOKENS = new Set([
  'present', 'presente', 'actual', 'actualidad', 'current', 'currently', 'now', 'hoy', 'hoje', 'today', ''
])

function isCurrentExp(fin: unknown): boolean {
  if (fin === null || fin === undefined) return true
  return PRESENT_TOKENS.has(String(fin).trim().toLowerCase())
}

function parseExpDate(dateStr: unknown): number {
  if (!dateStr) return Date.now()
  const str = String(dateStr).trim()
  const direct = new Date(str)
  if (!isNaN(direct.getTime())) return direct.getTime()
  const year = str.match(/\b(19|20)\d{2}\b/)
  if (year) return new Date(`${year[0]}-01-01`).getTime()
  return 0
}

function sortExperiencesByRecency(exps: any[]): any[] {
  return [...exps].sort((a, b) => {
    const aCur = isCurrentExp(a.fin)
    const bCur = isCurrentExp(b.fin)
    if (aCur && !bCur) return -1
    if (!aCur && bCur) return 1
    // Both current → most recent start date first
    if (aCur && bCur) return parseExpDate(b.inicio) - parseExpDate(a.inicio)
    // Both past → most recent end date first
    return parseExpDate(b.fin) - parseExpDate(a.fin)
  })
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

  // Detect CV language from the JD; fall back to user locale when no JD is provided
  function detectLang(text: string): 'en' | 'es' {
    const lower = text.toLowerCase()
    const words = lower.match(/\b[a-záéíóúüñ]+\b/g) || []

    // Exclusive English function words — none of these exist in Spanish
    const EN = new Set([
      'the', 'and', 'for', 'with', 'are', 'you', 'this', 'that', 'have', 'will',
      'our', 'your', 'we', 'is', 'of', 'to', 'in', 'an', 'be', 'at', 'as',
      'or', 'not', 'from', 'they', 'it', 'was', 'been', 'has', 'do', 'did',
      'can', 'could', 'would', 'should', 'may', 'might', 'must', 'shall',
      'about', 'if', 'when', 'what', 'which', 'who', 'how', 'all', 'each',
      'both', 'their', 'them', 'then', 'than', 'so', 'but', 'by', 'up',
      'out', 'on', 'more', 'also', 'into', 'its', 'just', 'over', 'after',
      'before', 'through', 'while', 'team', 'work', 'experience', 'skills',
      'role', 'join', 'seeking', 'looking', 'required', 'strong', 'proven',
      'including', 'candidate', 'position', 'responsibilities', 'preferred',
      'ability', 'knowledge', 'understanding', 'background', 'opportunity'
    ])

    // Exclusive Spanish function words — none of these exist in English
    const ES = new Set([
      'de', 'la', 'el', 'los', 'las', 'con', 'para', 'por', 'una', 'un',
      'que', 'del', 'se', 'su', 'es', 'al', 'lo', 'le', 'nos', 'como',
      'más', 'pero', 'ya', 'también', 'todo', 'sin', 'sobre', 'entre',
      'cuando', 'muy', 'hay', 'ser', 'tener', 'este', 'esta', 'estos',
      'estas', 'fue', 'han', 'son', 'tiene', 'buscamos', 'equipo',
      'experiencia', 'conocimientos', 'trabajo', 'empresa', 'años',
      'requisitos', 'responsabilidades', 'habilidades', 'perfil',
      'ofrecemos', 'buscamos', 'cargo', 'vacante', 'postular'
    ])

    let enCount = 0
    let esCount = 0
    for (const w of words) {
      if (EN.has(w)) enCount++
      if (ES.has(w)) esCount++
    }
    // Tie goes to English — better to output English CV than leave a Spanish CV for an English JD
    return enCount >= esCount ? 'en' : 'es'
  }

  const jdText = typeof jd === 'string' ? jd.trim() : ''
  const detectedLocale = jdText.length >= 30 ? detectLang(jdText) : (locale as string)
  const isEn = detectedLocale === 'en'

  const cvLength = Math.min(3, Math.max(1, Number(body.cvLength) || 1))
  const maxLogros = cvLength === 1 ? 2 : cvLength === 2 ? 3 : 5
  const summaryChars = cvLength === 1 ? 280 : cvLength === 2 ? 420 : 600
  const summaryLines = cvLength === 1 ? '2-3' : cvLength === 2 ? '3-4' : '4-6'

  // Validate JD length
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

  const systemPrompt = `You are an expert in CV optimization for ATS systems and recruiters.
Your goal is to adapt the user's CV to a specific job description without inventing experience, context, or metrics.

CRITICAL RULES:
1. Detect the language of the JD (English or Spanish). Set cv_locale to "en" or "es" accordingly. If no JD is provided, use the user profile language.
2. Write ALL generated text (summary, logros_optimizados, advice, next_steps, optimized_title) in the detected JD language.
3. Analyze the JD: detect responsibilities, tools, seniority, and expected results.
4. Evaluate each experience for relevance to the vacancy.
5. Respect entry types: "work" = formal employment. "project" = personal/academic/freelance. Never present a project as a formal job.
6. Rewrite achievements to connect them with the vacancy using only available context.
7. STAR method: Situation/Task → Action (candidate's contribution) → Result (impact).
8. Use numbers/percentages ONLY when explicitly stated in the user's data. Never invent metrics.
9. Include JD keywords only when they honestly match the candidate's real experience.
10. Write in FIRST PERSON. No third person or impersonal form.
11. For "summary": use ONLY information the user has explicitly provided. Do NOT infer or add competencies not stated by the user.
12. For top_skills: include ALL skills the user already listed. Do not add new ones. Order by relevance to the JD.
13. Return ONLY structured JSON.`

  const slimProfile = {
    nombre: profile?.nombre || '',
    titulo: profile?.titulo || '',
    resumen: profile?.resumen || '',
    years: profile?.years || '0',
    educacion: profile?.educacion || '',
    web: profile?.web || ''
  }

  const userPrompt = `PROFILE:
${JSON.stringify(slimProfile)}

EXPERIENCES:
${JSON.stringify(normalizedExperiences)}

JD:
${jd || 'N/A — perform a general high-quality optimization. Use the profile language.'}

CV LENGTH LEVEL: ${cvLength}/3
OUTPUT RULES:
- Detect the JD language first and set cv_locale ("en" or "es"). Write everything in that language.
- summary: ${summaryLines} lines, max ${summaryChars} characters. Use ONLY what the user stated — never infer competencies.
- Order experiences from highest to lowest relevance for the vacancy.
- MAX ${maxLogros} logros_optimizados per experience. Each one: 1-2 sentences, first person, specific to the vacancy.
- Do not invent percentages or metrics not present in the user's data.
${cvLength === 3 ? '- Extended mode: give rich, detailed achievements. Include all relevant experiences.' : ''}

RETURN ONLY JSON:
{
  "cv_locale": "en or es — detected language of the JD",
  "summary": "...",
  "optimized_title": "...",
  "experiences": [
    {
      "id": "same original id",
      "type": "work or project",
      "relevance_score": 0,
      "cargo": "...",
      "empresa": "...",
      "logros_optimizados": ["max ${maxLogros} achievements in the detected language"],
      "skills_sugeridas": ["key skills for this role"]
    }
  ],
  "top_skills": ["up to 20 skills STRICTLY from user's declared data, ordered by relevance to the JD"],
  "advice": ["3-4 tips to stand out, in the detected language"],
  "next_steps": ["3-4 concrete action items, in the detected language"]
}`

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

    result.experiences = sortExperiencesByRecency(result.experiences)

    // Use the locale the AI detected from the JD — much more reliable than heuristics
    const aiLocale = result.cv_locale === 'en' ? 'en' : result.cv_locale === 'es' ? 'es' : null
    result.cv_locale = aiLocale || detectedLocale

    // Suplementar top_skills con todas las skills declaradas por el usuario que la IA no incluyó
    const allDeclaredSkills = [
      ...normalizedExperiences.flatMap((exp: any) => Array.isArray(exp.skills) ? exp.skills : [])
    ]
    const aiSkills: string[] = Array.isArray(result.top_skills)
      ? result.top_skills.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean)
      : []
    const aiSkillsLower = new Set(aiSkills.map((s: string) => s.toLowerCase()))
    const missing = [...new Set(allDeclaredSkills)]
      .filter((s: string) => s && !aiSkillsLower.has(s.toLowerCase()))
    result.top_skills = [...aiSkills, ...missing]

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
