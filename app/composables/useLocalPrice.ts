import type { Currency, CurrencyCode } from '#shared/currency/types'
import { convert } from '#shared/currency/conversion'

interface ConfigResponse {
  supported: Currency[]
  detected: string | null
}

/**
 * Muestra un monto en COP convertido a la moneda local elegida.
 * - Preselecciona la moneda detectada por IP (header de Vercel, vía /api/currency/config).
 * - Tasa cache-first vía /api/currency/rate; reusa por moneda.
 * - Si la moneda es COP o la API falla → `converted` = null (la UI muestra solo el COP).
 *
 * @param copAmount getter del monto en COP a convertir (refleja descuentos si los hay).
 */
export function useLocalPrice(copAmount: () => number) {
  const currencies = ref<Currency[]>([])
  const displayCurrency = ref<CurrencyCode>('COP')
  const rate = ref<number | null>(null)
  const loading = ref(false)
  const error = ref(false)

  const rateCache: Record<string, number> = {}

  const fetchRate = async () => {
    const to = displayCurrency.value
    if (to === 'COP') {
      rate.value = 1
      error.value = false
      return
    }
    if (rateCache[to] != null) {
      rate.value = rateCache[to]
      error.value = false
      return
    }
    loading.value = true
    error.value = false
    try {
      const data = await $fetch<{ rate: number }>('/api/currency/rate', { query: { to } })
      rate.value = data.rate
      rateCache[to] = data.rate
    } catch {
      error.value = true
      rate.value = null
    } finally {
      loading.value = false
    }
  }

  const converted = computed<number | null>(() => {
    if (displayCurrency.value === 'COP' || error.value || rate.value == null) return null
    try {
      return convert(copAmount(), rate.value)
    } catch {
      return null
    }
  })

  watch(displayCurrency, fetchRate)

  onMounted(async () => {
    try {
      const cfg = await $fetch<ConfigResponse>('/api/currency/config')
      currencies.value = cfg.supported
      if (cfg.detected) displayCurrency.value = cfg.detected as CurrencyCode
    } catch {
      // Sin config: se queda en COP (fallback esperado).
    }
    await fetchRate()
  })

  return { currencies, displayCurrency, converted, rate, loading, error }
}
