<template>
  <div class="relative">
    <button
      type="button"
      @click="open = !open"
      class="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-200"
    >
      <img :src="flagUrl(modelValue)" alt="" class="h-3.5 w-5 rounded-[2px] object-cover" />
      {{ modelValue }}
      <svg class="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <template v-if="open">
      <!-- click-outside catcher -->
      <div class="fixed inset-0 z-40" @click="open = false"></div>
      <ul class="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
        <li v-for="o in allOptions" :key="o.code">
          <button
            type="button"
            @click="select(o.code)"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50"
            :class="o.code === modelValue ? 'font-bold text-indigo-600' : 'text-slate-700'"
          >
            <img :src="flagUrl(o.code)" alt="" class="h-3.5 w-5 shrink-0 rounded-[2px] object-cover" />
            <span class="font-semibold">{{ o.code }}</span>
            <span class="truncate text-slate-400">{{ currencyName(o.code) }}</span>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Currency } from '#shared/currency/types'

interface Opt { code: string }

const props = defineProps<{ modelValue: string; options: Currency[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { t } = useI18n()

const open = ref(false)

// Divisa -> país ISO alpha-2 para la bandera (flagcdn).
const FLAGS: Record<string, string> = {
  COP: 'co', USD: 'us', EUR: 'eu', MXN: 'mx', GBP: 'gb', BRL: 'br', PEN: 'pe', CLP: 'cl',
}

const allOptions = computed<Opt[]>(() => [
  { code: 'COP' },
  ...props.options.map((c) => ({ code: c.code })),
])

const flagUrl = (code: string) => `https://flagcdn.com/40x30/${FLAGS[code] || 'un'}.png`
const currencyName = (code: string) => t(`checkout.currency_names.${code}`)

const select = (code: string) => {
  emit('update:modelValue', code)
  open.value = false
}
</script>
