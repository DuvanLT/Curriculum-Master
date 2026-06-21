import { describe, it, expect } from 'vitest'
import { parseFrankfurterRate, FrankfurterProvider } from '../../server/utils/currency/frankfurter'

describe('parseFrankfurterRate', () => {
  it('parsea el formato plano { rate }', () => {
    const r = parseFrankfurterRate({ date: '2026-06-19', base: 'COP', quote: 'USD', rate: 0.000289 }, 'USD')
    expect(r).toEqual({ base: 'COP', quote: 'USD', rate: 0.000289, date: '2026-06-19' })
  })
  it('parsea el formato anidado { rates: { USD } }', () => {
    const r = parseFrankfurterRate({ date: '2026-06-19', base: 'COP', rates: { USD: 0.000289 } }, 'USD')
    expect(r.rate).toBe(0.000289)
    expect(r.quote).toBe('USD')
  })
  it('lanza si no hay tasa', () => {
    expect(() => parseFrankfurterRate({ date: '2026-06-19', rates: { EUR: 0.0002 } }, 'USD')).toThrow()
    expect(() => parseFrankfurterRate({}, 'USD')).toThrow()
  })
})

describe('FrankfurterProvider', () => {
  it('usa el fetcher inyectado y normaliza la respuesta', async () => {
    const provider = new FrankfurterProvider(async () => ({ date: '2026-06-19', rate: 0.00029 }))
    const r = await provider.getRate('USD')
    expect(r).toEqual({ base: 'COP', quote: 'USD', rate: 0.00029, date: '2026-06-19' })
  })
})
