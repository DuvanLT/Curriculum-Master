import type { Currency, SupportedCurrency } from './types'

export const DEFAULT_CURRENCY: SupportedCurrency = 'USD'

export const SUPPORTED_CURRENCIES: Record<SupportedCurrency, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'Dólar estadounidense' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  MXN: { code: 'MXN', symbol: '$', name: 'Peso mexicano' },
  GBP: { code: 'GBP', symbol: '£', name: 'Libra esterlina' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Real brasileño' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Sol peruano' },
  CLP: { code: 'CLP', symbol: '$', name: 'Peso chileno' },
}

export const SUPPORTED_CURRENCY_LIST: Currency[] = Object.values(SUPPORTED_CURRENCIES)

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, code)
}
