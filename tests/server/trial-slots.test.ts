import { describe, it, expect } from 'vitest'
import { computeTrialSlots, TRIAL_SLOTS_TOTAL } from '../../server/utils/trial-slots'

describe('computeTrialSlots', () => {
  it('total = 15', () => {
    expect(TRIAL_SLOTS_TOTAL).toBe(15)
  })

  it('cuenta 0 -> 15 (lleno)', () => {
    expect(computeTrialSlots(0)).toBe(15)
  })

  it('va bajando: 1 -> 14, 14 -> 1', () => {
    expect(computeTrialSlots(1)).toBe(14)
    expect(computeTrialSlots(14)).toBe(1)
  })

  it('en múltiplos de 15 reinicia a 15 (nunca 0)', () => {
    expect(computeTrialSlots(15)).toBe(15)
    expect(computeTrialSlots(30)).toBe(15)
  })

  it('tras el reinicio sigue bajando: 16 -> 14', () => {
    expect(computeTrialSlots(16)).toBe(14)
  })

  it('nunca devuelve 0 ni fuera de rango 1..15', () => {
    for (let n = 0; n <= 100; n++) {
      const slots = computeTrialSlots(n)
      expect(slots).toBeGreaterThanOrEqual(1)
      expect(slots).toBeLessThanOrEqual(15)
    }
  })
})
