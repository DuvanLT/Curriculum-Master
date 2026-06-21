import type { ExchangeRate, SupportedCurrency } from '#shared/currency/types'

export function parseFrankfurterRate(json: any, quote: SupportedCurrency): ExchangeRate {
  const date = String(json?.date || new Date().toISOString().slice(0, 10))
  let rate: unknown
  if (typeof json?.rate === 'number') {
    rate = json.rate
  } else if (json?.rates && typeof json.rates[quote] === 'number') {
    rate = json.rates[quote]
  }
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error(`No se encontró tasa para ${quote}`)
  }
  return { base: 'COP', quote, rate, date }
}

export interface ExchangeRateProvider {
  getRate(to: SupportedCurrency): Promise<ExchangeRate>
}

type Fetcher = (url: string) => Promise<any>

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export class FrankfurterProvider implements ExchangeRateProvider {
  constructor(private fetcher: Fetcher = defaultFetcher) {}

  async getRate(to: SupportedCurrency): Promise<ExchangeRate> {
    const json = await this.fetcher(`https://api.frankfurter.dev/v2/rate/COP/${to}`)
    return parseFrankfurterRate(json, to)
  }
}
