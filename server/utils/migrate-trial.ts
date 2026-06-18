import type { H3Event } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { getAnonId, clearAnonId } from './anon-trial'
import { saveUserProfile } from './profile'

export async function migrateAnonymousTrial(
  event: H3Event,
  db: any,
  userId: string,
): Promise<boolean> {
  try {
    const anonId = getAnonId(event)
    if (!anonId) return false

    const trialResult = await db.execute({
      sql: `SELECT profile_json, experiences_json, educations_json, audit_result_json,
                   jd_text, analysis_result_json
            FROM anonymous_trials
            WHERE id = ? AND migrated_to_user_id IS NULL`,
      args: [anonId],
    })
    const trial = trialResult.rows[0] as any
    if (!trial?.profile_json) return false

    const profile = JSON.parse(trial.profile_json as string)
    const experiences = trial.experiences_json ? JSON.parse(trial.experiences_json as string) : []
    const educations = trial.educations_json ? JSON.parse(trial.educations_json as string) : []

    await saveUserProfile(db, userId, { profile, educations, experiences })

    if (trial.audit_result_json) {
      const auditResult = JSON.parse(trial.audit_result_json as string)
      await db.execute({
        sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuidv4(),
          userId,
          'Auditoría inicial de CV',
          'Auditoría General',
          'Diagnóstico de perfil',
          auditResult.score || 0,
          JSON.stringify({
            keywords_presentes: auditResult.fortalezas || [],
            keywords_faltantes: auditResult.debilidades || [],
            analisis: auditResult.recomendacion || '',
            recomendaciones: auditResult.debilidades || [],
            hard_skills_jd: [],
          }),
        ],
      })
    }

    if (trial.analysis_result_json) {
      const analysisResult = JSON.parse(trial.analysis_result_json as string)
      await db.execute({
        sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          uuidv4(),
          userId,
          trial.jd_text || '',
          (analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null') ? analysisResult.company : null,
          (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : null,
          analysisResult.score || 0,
          trial.analysis_result_json,
        ],
      })
    }

    await db.execute({
      sql: 'UPDATE anonymous_trials SET migrated_to_user_id = ? WHERE id = ?',
      args: [userId, anonId],
    })

    clearAnonId(event)
    return true
  } catch (error) {
    console.error('Error migrating anonymous trial data:', error)
    return false
  }
}
