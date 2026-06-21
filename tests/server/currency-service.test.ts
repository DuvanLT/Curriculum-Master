import { describe, it, expect } from 'vitest'
import { CurrencyService } from '../../server/utils/currency/currency-service'
import { CacheService } from '../../server/utils/currency/cache'
import type { ExchangeRate } from '#shared/currency/types'
import type { ExchangeRateProvider } from '../../server/utils/currency/frankfurter'

function makeProvider() {
  let calls = 0
  const provider: ExchangeRateProvider = {
    async getRate(to) {
      calls++
      return { base: 'COP', quote: to, rate: 0.00029, date: '2026-06-19' }
    },
  }
  return { provider, calls: () => calls }
}

describe('CurrencyService', () => {
  it('cache-first: 1ª llamada al provider, 2ª desde caché', async () => {
    const { provider, calls } = makeProvider()
    const svc = new CurrencyService(provider, new CacheService<ExchangeRate>(), 60000)
    const r1 = await svc.getRate('USD')
    const r2 = await svc.getRate('USD')
    expect(r1.rate).toBe(0.00029)
    expect(r2).toEqual(r1)
    expect(calls()).toBe(1)
  })
  it('COP no llama al provider y devuelve rate 1', async () => {
    const { provider, calls } = makeProvider()
    const svc = new CurrencyService(provider, new CacheService<ExchangeRate>())
    const r = await svc.getRate('COP')
    expect(r.rate).toBe(1)
    expect(r.quote).toBe('COP')
    expect(calls()).toBe(0)
  })
})
