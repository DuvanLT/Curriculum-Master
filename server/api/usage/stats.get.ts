import { requireVerifiedUserSession } from '../../utils/verified-session'
import { FREE_TRIAL_LIMITS, isProUser } from '../../utils/subscription'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const db = useDb()

  try {
    const cvsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM generated_cvs WHERE user_id = ?',
      args: [userId]
    })

    const analysesResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM job_analyses WHERE user_id = ?',
      args: [userId]
    })

    const cvs = Number(cvsResult.rows[0]?.count || 0)
    const analyses = Number(analysesResult.rows[0]?.count || 0)

    const isPro = isProUser(session.user?.subscription_name)
    const canGenerateCV = isPro || cvs < FREE_TRIAL_LIMITS.MAX_CVS
    const canAnalyzeOffer = isPro || analyses < FREE_TRIAL_LIMITS.MAX_ANALYSES
    
    const remainingCVs = isPro ? Infinity : Math.max(0, FREE_TRIAL_LIMITS.MAX_CVS - cvs)
    const remainingAnalyses = isPro ? Infinity : Math.max(0, FREE_TRIAL_LIMITS.MAX_ANALYSES - analyses)

    return {
      cvs,
      analyses,
      limits: FREE_TRIAL_LIMITS,
      canGenerateCV,
      canAnalyzeOffer,
      remainingCVs,
      remainingAnalyses
    }
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al obtener las estadísticas de uso.'
    })
  }
})
