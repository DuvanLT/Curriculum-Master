import { getAnonId } from '../../utils/anon-trial'

export default defineEventHandler(async (event) => {
  const anonId = getAnonId(event)

  const empty = {
    importUsed: false,
    auditUsed: false,
    analyzeUsed: false,
    profile: null,
    experiences: [] as any[],
    auditResult: null,
    jdText: '',
    analysisResult: null
  }

  if (!anonId) return empty

  const db = useDb()
  const result = await db.execute({
    sql: `SELECT profile_json, experiences_json, import_used, audit_used, audit_result_json,
                 analyze_used, jd_text, analysis_result_json
          FROM anonymous_trials WHERE id = ?`,
    args: [anonId]
  })

  const row = result.rows[0] as any
  if (!row) return empty

  return {
    importUsed: Boolean(row.import_used),
    auditUsed: Boolean(row.audit_used),
    analyzeUsed: Boolean(row.analyze_used),
    profile: row.profile_json ? JSON.parse(row.profile_json as string) : null,
    experiences: row.experiences_json ? JSON.parse(row.experiences_json as string) : [],
    auditResult: row.audit_result_json ? JSON.parse(row.audit_result_json as string) : null,
    jdText: row.jd_text || '',
    analysisResult: row.analysis_result_json ? JSON.parse(row.analysis_result_json as string) : null
  }
})
