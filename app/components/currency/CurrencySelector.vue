<template>
  <select
    :value="modelValue"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    class="rounded-xl border border-border bg-[var(--bg2)] px-3 py-2.5 text-sm font-medium text-text focus:border-amber focus:outline-none"
  >
    <option v-for="c in options" :key="c.code" :value="c.code">
      {{ c.symbol }} {{ c.code }} — {{ c.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import type { Currency } from '#shared/currency/types'

defineProps<{ modelValue: string; options: Currency[] }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
