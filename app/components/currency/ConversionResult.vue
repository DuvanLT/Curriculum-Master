<template>
  <div class="rounded-xl border border-border bg-[var(--bg2)] p-4">
    <div v-if="loading" class="flex items-center gap-2 text-text-dim text-sm">
      <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber/40 border-t-amber"></span>
      Calculando...
    </div>
    <div v-else-if="error" class="text-sm text-red font-medium">
      No se pudo obtener la tasa. Intenta de nuevo más tarde.
    </div>
    <div v-else-if="result != null">
      <div class="text-3xl font-bold text-text">
        {{ symbol }}{{ result.toLocaleString('es-CO', { maximumFractionDigits: 2 }) }}
        <span class="text-base font-mono text-text-dim">{{ currency }}</span>
      </div>
      <div v-if="rateDate" class="mt-1 text-[11px] font-mono text-text-dim">
        Tasa del {{ rateDate }}
      </div>
    </div>
    <div v-else class="text-sm text-text-dim">Ingresa una cantidad para convertir.</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  result: number | null
  symbol: string
  currency: string
  rateDate: string
  loading: boolean
  error: boolean
}>()
</script>
