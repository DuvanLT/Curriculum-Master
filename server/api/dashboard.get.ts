import { requireVerifiedUserSession } from '../utils/verified-session'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const db = useDb()

  try {
    // ─── 1. Fetch all job analyses ───
    const { rows: analysisRows } = await db.execute({
      sql: 'SELECT score, analysis_json, company, position, created_at FROM job_analyses WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId]
    })

    const analyses = analysisRows.map((row: any) => {
      let parsed: any = {}
      try { parsed = JSON.parse(row.analysis_json) } catch {}
      return { ...row, analysis: parsed }
    })

    // ─── 2. Fetch user experiences (skills) ───
    const { rows: expRows } = await db.execute({
      sql: 'SELECT skills FROM experiences WHERE user_id = ?',
      args: [userId]
    })

    const userSkills = new Set<string>()
    for (const row of expRows) {
      try {
        const skills = JSON.parse(row.skills as string)
        if (Array.isArray(skills)) {
          skills.forEach((s: string) => userSkills.add(s.toLowerCase().trim()))
        }
      } catch {}
    }

    // ─── 3. ATS Score & Skills Analysis ───
    const scores = analyses.map((a: any) => a.score).filter((s: any) => typeof s === 'number' && s > 0)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0

    // Aggregate skills demanded across all analyses
    const skillDemandMap = new Map<string, number>()
    for (const a of analyses) {
      const hardSkills = a.analysis?.hard_skills_jd || []
      for (const hs of hardSkills) {
        const name = (hs.skill || '').toLowerCase().trim()
        if (name) {
          skillDemandMap.set(name, (skillDemandMap.get(name) || 0) + (hs.count || 1))
        }
      }
    }

    const demandedSkills = Array.from(skillDemandMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => ({
        skill,
        count,
        userHas: userSkills.has(skill)
      }))

    // Quick Wins: top missing skills with highest demand
    const quickWins = demandedSkills
      .filter(s => !s.userHas)
      .slice(0, 3)
      .map(s => ({
        skill: s.skill,
        demandCount: s.count,
        impact: Math.min(20, Math.round(s.count * 2.5))
      }))

    // ─── 4. Pipeline / Funnel ───
    const totalAnalyses = analyses.length

    const { rows: cvCountRows } = await db.execute({
      sql: 'SELECT COUNT(*) as total FROM generated_cvs WHERE user_id = ?',
      args: [userId]
    })
    const totalCVs = Number(cvCountRows[0]?.total ?? 0)

    const { rows: appRows } = await db.execute({
      sql: 'SELECT status FROM applications WHERE user_id = ?',
      args: [userId]
    })

    const totalApplications = appRows.length
    const statusCounts: Record<string, number> = {}
    for (const row of appRows) {
      const status = String(row.status || 'Pendiente')
      statusCounts[status] = (statusCounts[status] || 0) + 1
    }

    const totalInterviews = statusCounts['Entrevista'] || 0
    const totalOffers = statusCounts['Oferta'] || 0

    // Conversion rates (capped at 100%)
    const rateAnalysesToCVs = totalAnalyses > 0 ? Math.min(100, Math.round((totalCVs / totalAnalyses) * 100)) : 0
    const rateCVsToApps = totalCVs > 0 ? Math.min(100, Math.round((totalApplications / totalCVs) * 100)) : 0
    const rateAppsToInterviews = totalApplications > 0 ? Math.min(100, Math.round((totalInterviews / totalApplications) * 100)) : 0
    const rateInterviewsToOffers = totalInterviews > 0 ? Math.min(100, Math.round((totalOffers / totalInterviews) * 100)) : 0

    // Generate pipeline insight
    let pipelineInsight = ''
    if (totalAnalyses === 0) {
      pipelineInsight = 'dashboard.insights.start_analyzing'
    } else if (totalCVs === 0) {
      pipelineInsight = 'dashboard.insights.generate_cv'
    } else if (totalApplications === 0) {
      pipelineInsight = 'dashboard.insights.time_to_apply'
    } else if (rateAppsToInterviews < 20 && totalApplications >= 3) {
      pipelineInsight = 'dashboard.insights.low_interview_rate'
    } else if (totalInterviews > 0 && totalOffers === 0) {
      pipelineInsight = 'dashboard.insights.practice_interviews'
    } else if (totalOffers > 0) {
      pipelineInsight = 'dashboard.insights.great_progress'
    } else {
      pipelineInsight = 'dashboard.insights.keep_generating'
    }

    // ─── 5. Market Fit ───
    // Top companies
    const companyMap = new Map<string, number>()
    for (const a of analyses) {
      const company = (a.company || '').trim()
      if (company && company !== 'N/A') {
        companyMap.set(company, (companyMap.get(company) || 0) + 1)
      }
    }
    const topCompanies = Array.from(companyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))

    // Trending keywords (from keywords_presentes + keywords_faltantes)
    const keywordMap = new Map<string, number>()
    for (const a of analyses) {
      const allKeywords = [
        ...(a.analysis?.keywords_presentes || []),
        ...(a.analysis?.keywords_faltantes || [])
      ]
      for (const kw of allKeywords) {
        const name = (kw || '').toLowerCase().trim()
        if (name) {
          keywordMap.set(name, (keywordMap.get(name) || 0) + 1)
        }
      }
    }
    const trendingKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword, count]) => ({ keyword, count }))

    // ─── 6. CV History ───
    const { rows: cvRows } = await db.execute({
      sql: 'SELECT id, company, position, jd_text, created_at FROM generated_cvs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      args: [userId]
    })

    const cvHistory = cvRows.map((row: any) => ({
      id: row.id,
      company: row.company || 'General',
      position: row.position || 'CV Optimizado',
      hasJD: Boolean(row.jd_text),
      created_at: row.created_at
    }))

    // ─── 7. Score history for sparkline ───
    const scoreHistory = analyses
      .slice(0, 10)
      .reverse()
      .map((a: any) => ({
        score: a.score || 0,
        date: a.created_at
      }))

    return {
      atsScore: {
        average: avgScore,
        totalAnalyses,
        scoreHistory,
        demandedSkills,
        userSkillCount: userSkills.size,
        quickWins
      },
      pipeline: {
        analyses: totalAnalyses,
        cvs: totalCVs,
        applications: totalApplications,
        interviews: totalInterviews,
        offers: totalOffers,
        statusCounts,
        rates: {
          analysesToCVs: rateAnalysesToCVs,
          cvsToApps: rateCVsToApps,
          appsToInterviews: rateAppsToInterviews,
          interviewsToOffers: rateInterviewsToOffers
        },
        insight: pipelineInsight
      },
      marketFit: {
        topCompanies,
        trendingKeywords
      },
      cvHistory
    }
  } catch (e: any) {
    console.error('Dashboard API error:', e)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al cargar el dashboard'
    })
  }
})
