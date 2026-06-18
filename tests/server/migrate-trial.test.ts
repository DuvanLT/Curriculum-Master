import { describe, it, expect, vi } from 'vitest'

// Mock de utils de anon-trial usados por el módulo.
vi.mock('../../server/utils/anon-trial', () => ({
  getAnonId: vi.fn(() => 'anon-1'),
  clearAnonId: vi.fn(),
}))
vi.mock('../../server/utils/profile', () => ({
  saveUserProfile: vi.fn(async () => {}),
}))

import { migrateAnonymousTrial } from '../../server/utils/migrate-trial'

function makeDb(trialRow: any | null) {
  const calls: { sql: string; args: any[] }[] = []
  return {
    calls,
    async execute({ sql, args }: { sql: string; args: any[] }) {
      calls.push({ sql, args })
      if (/FROM anonymous_trials/i.test(sql)) {
        return { rows: trialRow ? [trialRow] : [] }
      }
      return { rows: [] }
    },
  }
}

describe('migrateAnonymousTrial', () => {
  it('devuelve false cuando no hay datos de trial', async () => {
    const db = makeDb(null)
    const result = await migrateAnonymousTrial({} as any, db as any, 'user-1')
    expect(result).toBe(false)
  })

  it('migra y marca el trial cuando hay profile_json, devolviendo true', async () => {
    const trial = {
      profile_json: JSON.stringify({ nombre: 'X' }),
      experiences_json: null,
      educations_json: null,
      audit_result_json: null,
      jd_text: null,
      analysis_result_json: null,
    }
    const db = makeDb(trial)
    const result = await migrateAnonymousTrial({} as any, db as any, 'user-1')
    expect(result).toBe(true)
    const marked = db.calls.find((c) => /UPDATE anonymous_trials SET migrated_to_user_id/i.test(c.sql))
    expect(marked).toBeTruthy()
  })
})
