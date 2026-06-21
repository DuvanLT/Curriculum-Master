<template>
  <div class="min-h-dvh bg-[var(--bg)] flex items-center justify-center p-6">
    <div class="w-full max-w-md rounded-2xl border border-border bg-[var(--bg2)] p-6 sm:p-8">
      <h1 class="font-head text-2xl font-bold text-text mb-1">Conversor de divisas</h1>
      <p class="text-[12px] font-mono text-text-dim mb-6">Desde Pesos Colombianos (COP)</p>

      <label class="block text-xs font-semibold text-text-dim mb-2">Cantidad en COP</label>
      <input
        v-model.number="amountCop"
        type="number"
        min="0"
        class="w-full rounded-xl border border-border bg-[var(--bg)] px-3 py-2.5 text-sm text-text focus:border-amber focus:outline-none mb-4"
      />

      <label class="block text-xs font-semibold text-text-dim mb-2">Convertir a</label>
      <CurrencySelector v-model="targetCurrency" :options="supported" class="w-full mb-5" />

      <ConversionResult
        :result="result"
        :symbol="symbol"
        :currency="targetCurrency"
        :rate-date="rateDate"
        :loading="loading"
        :error="error"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SUPPORTED_CURRENCIES, SUPPORTED_CURRENCY_LIST, DEFAULT_CURRENCY } from '#shared/currency/currencies'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'
import type { CurrencyCode } from '#shared/currency/types'

// Preselección por país (SSR, header de Vercel) con fallback a USD.
const headers = useRequestHeaders(['x-vercel-ip-country'])
const detected = resolveCurrencyFromCountry(headers['x-vercel-ip-country'])
const initial: CurrencyCode = detected || DEFAULT_CURRENCY

const supported = SUPPORTED_CURRENCY_LIST
const { amountCop, targetCurrency, result, rateDate, loading, error } = useCurrencyConverter(initial)

const symbol = computed(() => {
  const code = targetCurrency.value
  return code === 'COP' ? '$' : (SUPPORTED_CURRENCIES[code]?.symbol || '')
})

useSeoMeta({ title: 'Conversor de divisas | BringJobs' })
</script>
