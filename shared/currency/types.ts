export type SupportedCurrency = 'USD' | 'EUR' | 'MXN' | 'GBP' | 'BRL' | 'PEN' | 'CLP'
export type CurrencyCode = SupportedCurrency | 'COP'

export interface Currency {
  code: SupportedCurrency
  symbol: string
  name: string
}

export interface ExchangeRate {
  base: 'COP'
  quote: CurrencyCode
  rate: number
  date: string
}

export interface ConversionResult {
  amountCop: number
  currency: CurrencyCode
  rate: number
  result: number
  date: string
}
