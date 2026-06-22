import type { ExchangeRate } from '#shared/currency/types'
import { CacheService } from './cache'
import { FrankfurterProvider } from './frankfurter'
import { CurrencyService } from './currency-service'

let cached: CurrencyService | null = null

export function useCurrencyService(): CurrencyService {
  if (!cached) {
    cached = new CurrencyService(new FrankfurterProvider(), new CacheService<ExchangeRate>())
  }
  return cached
}
