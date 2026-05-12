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

    const userResult = await db.execute({
      sql: 'SELECT subscription_name FROM users WHERE id = ?',
      args: [userId]
    })
    
    const userRow = userResult.rows[0] as any
    const dbPlan = userRow?.subscription_name || 'free_trial'
    
    // Sync session if it's outdated
    if (dbPlan !== session.user.subscription_name) {
      await setUserSession(event, {
        user: {
          ...session.user,
          subscription_name: dbPlan
        }
      })
    }

    const isPro = isProUser(dbPlan)
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
      remainingAnalyses,
      subscriptionName: userRow?.subscription_name || 'free_trial'
    }
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Error al obtener las estadísticas de uso.'
    })
  }
})
