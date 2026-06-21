import type { CurrencyCode, ExchangeRate, SupportedCurrency } from '#shared/currency/types'
import type { CacheService } from './cache'
import type { ExchangeRateProvider } from './frankfurter'

const TTL_24H = 24 * 60 * 60 * 1000

export class CurrencyService {
  constructor(
    private provider: ExchangeRateProvider,
    private cache: CacheService<ExchangeRate>,
    private ttlMs: number = TTL_24H,
  ) {}

  async getRate(to: CurrencyCode): Promise<ExchangeRate> {
    if (to === 'COP') {
      return { base: 'COP', quote: 'COP', rate: 1, date: new Date().toISOString().slice(0, 10) }
    }
    const cached = this.cache.get(to)
    if (cached) return cached
    const rate = await this.provider.getRate(to as SupportedCurrency)
    this.cache.set(to, rate, this.ttlMs)
    return rate
  }
}
