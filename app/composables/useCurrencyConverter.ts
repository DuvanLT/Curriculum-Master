import type { CurrencyCode, ExchangeRate } from '#shared/currency/types'
import { convert } from '#shared/currency/conversion'
import { DEFAULT_CURRENCY } from '#shared/currency/currencies'

export function useCurrencyConverter(initialCurrency?: CurrencyCode) {
  const amountCop = ref<number>(100000)
  const targetCurrency = ref<CurrencyCode>(initialCurrency || DEFAULT_CURRENCY)
  const rate = ref<number | null>(null)
  const rateDate = ref<string>('')
  const result = ref<number | null>(null)
  const loading = ref(false)
  const error = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let lastCurrency: CurrencyCode | null = null

  const compute = () => {
    if (rate.value != null && Number.isFinite(amountCop.value) && amountCop.value >= 0) {
      result.value = convert(amountCop.value, rate.value)
    } else {
      result.value = null
    }
  }

  const fetchRate = async () => {
    const to = targetCurrency.value
    // Reusar la tasa si la moneda no cambió.
    if (to === lastCurrency && rate.value != null) {
      compute()
      return
    }
    // COP->COP no llama a ninguna API.
    if (to === 'COP') {
      rate.value = 1
      rateDate.value = new Date().toISOString().slice(0, 10)
      lastCurrency = to
      error.value = false
      compute()
      return
    }
    loading.value = true
    error.value = false
    try {
      const data = await $fetch<ExchangeRate>('/api/currency/rate', { query: { to } })
      rate.value = data.rate
      rateDate.value = data.date
      lastCurrency = to
      compute()
    } catch {
      error.value = true
      rate.value = null
      result.value = null
    } finally {
      loading.value = false
    }
  }

  const scheduleConversion = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchRate, 400)
  }

  watch(amountCop, () => { compute(); scheduleConversion() })
  watch(targetCurrency, () => { scheduleConversion() })

  onMounted(fetchRate)

  return { amountCop, targetCurrency, rate, rateDate, result, loading, error }
}
