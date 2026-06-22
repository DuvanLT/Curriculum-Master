import { SUPPORTED_CURRENCY_LIST } from '#shared/currency/currencies'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'

export default defineEventHandler((event) => {
  const country = getHeader(event, 'x-vercel-ip-country')
  return {
    supported: SUPPORTED_CURRENCY_LIST,
    detected: resolveCurrencyFromCountry(country),
  }
})
