import { isSupportedCurrency } from '#shared/currency/currencies'
import { useCurrencyService } from '../../utils/currency/service'

export default defineEventHandler(async (event) => {
  const to = String(getQuery(event).to || '').toUpperCase()

  if (to === 'COP') {
    return { base: 'COP', quote: 'COP', rate: 1, date: new Date().toISOString().slice(0, 10) }
  }
  if (!isSupportedCurrency(to)) {
    throw createError({ statusCode: 400, statusMessage: 'Moneda no soportada' })
  }

  try {
    return await useCurrencyService().getRate(to)
  } catch (e: any) {
    console.error('[Currency] Error obteniendo tasa:', e?.message || e)
    throw createError({ statusCode: 502, statusMessage: 'No se pudo obtener la tasa de cambio' })
  }
})
