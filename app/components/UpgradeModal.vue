<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>

      <!-- Modal Panel -->
      <div class="relative w-full max-w-md transform transition-all">
        <!-- Close button -->
        <button 
          @click="$emit('close')" 
          class="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="group relative overflow-hidden rounded-[2.5rem] bg-white p-6 shadow-[0_20px_80px_rgba(79,70,229,0.25)] ring-1 ring-slate-100 sm:p-10">
          <!-- Decorative Background -->
          <div class="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-50 blur-3xl transition duration-500 group-hover:bg-indigo-100" />

          <div class="relative z-10">
            <!-- Header: Limit Reached Message -->
            <div class="mb-6 sm:mb-8 text-center">
              <div class="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <svg class="h-6 w-6 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 class="text-xl sm:text-2xl font-black italic text-slate-900 mb-2">¡Mejora tu plan!</h2>
              <p class="text-xs sm:text-sm text-slate-500 font-medium">Has alcanzado el límite de tu plan gratuito. Desbloquea todo el potencial para conseguir tu trabajo ideal.</p>
            </div>

            <!-- Price -->
            <div class="mb-6 sm:mb-8 flex items-baseline justify-center gap-2 sm:gap-3">
              <span class="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">$32.500</span>
              <span class="text-lg sm:text-xl font-bold text-slate-300 line-through decoration-2">$44.900</span>
              <span class="text-xs sm:text-sm font-bold text-slate-400">COP</span>
            </div>

            <!-- Benefits List -->
            <ul class="mb-6 sm:mb-10 space-y-3 sm:space-y-4 max-h-[35dvh] sm:max-h-[40dvh] overflow-y-auto pr-2 custom-scrollbar">
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit1') }}</strong> {{ t('landing.pricing_benefit1_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit2') }}</strong> {{ t('landing.pricing_benefit2_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit3') }}</strong> {{ t('landing.pricing_benefit3_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit4') }}</strong> {{ t('landing.pricing_benefit4_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit5') }}</strong> {{ t('landing.pricing_benefit5_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit6') }}</strong> {{ t('landing.pricing_benefit6_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit7') }}</strong> {{ t('landing.pricing_benefit7_desc') }}</span>
              </li>
              <li class="flex items-start gap-3 sm:gap-4">
                <div class="mt-0.5 sm:mt-1 flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <svg class="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </div>
                <span class="text-xs sm:text-sm text-slate-600"><strong class="font-bold text-slate-900">{{ t('landing.pricing_benefit8') }}</strong> {{ t('landing.pricing_benefit8_desc') }}</span>
              </li>
            </ul>

            <!-- Call to Action -->
            <button
              @click="handleUpgrade"
              :disabled="loading"
              class="block w-full rounded-3xl bg-indigo-600 px-6 sm:px-8 py-3 sm:py-4 text-center text-base sm:text-lg font-bold text-white shadow-xl shadow-indigo-500/25 transition hover:-translate-y-1 hover:bg-indigo-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              <span v-if="loading" class="inline-flex items-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
              <span v-else>
                {{ t('landing.pricing_cta') }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n()
const loading = ref(false)

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const handleUpgrade = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await $fetch<{ url: string }>('/api/checkout/payment', {
      method: 'POST'
    })
    if (response?.url) {
      // Redirect in the same window to prevent mobile pop-up blockers
      window.location.href = response.url
    }
  } catch (error) {
    console.error('Error initiating checkout:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div:nth-child(2) {
  animation: modal-panel-in 0.3s ease-out forwards;
}

.modal-leave-active > div:nth-child(2) {
  animation: modal-panel-in 0.2s ease-in reverse forwards;
}

@keyframes modal-panel-in {
  from {
    transform: scale(0.95) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
</style>
