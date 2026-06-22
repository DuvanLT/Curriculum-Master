import type { SupportedCurrency } from './types'
import { isSupportedCurrency } from './currencies'

// País ISO 3166-1 alpha-2 -> divisa soportada. Agregar país = 1 entrada.
export const COUNTRY_CURRENCY: Record<string, SupportedCurrency> = {
  US: 'USD', EC: 'USD', PA: 'USD', SV: 'USD',
  MX: 'MXN',
  GB: 'GBP',
  BR: 'BRL',
  PE: 'PEN',
  CL: 'CLP',
  // Eurozona
  ES: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR',
  IE: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR',
}

export function resolveCurrencyFromCountry(country?: string | null): SupportedCurrency | null {
  if (!country) return null
  const code = COUNTRY_CURRENCY[country.toUpperCase()]
  return code && isSupportedCurrency(code) ? code : null
}
