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
            <div class="mb-6 sm:mb-8 flex flex-wrap items-baseline justify-center gap-x-2 sm:gap-x-3 gap-y-1">
              <template v-if="appliedDiscount">
                <span class="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">${{ appliedDiscount.final_amount.toLocaleString('es-CO') }}</span>
                <span class="text-lg sm:text-xl font-bold text-slate-300 line-through decoration-2">$32.500</span>
                <span class="rounded-full bg-green-100 px-2 py-0.5 text-xs sm:text-sm font-bold text-green-700">−{{ appliedDiscount.discount_percent }}%</span>
              </template>
              <template v-else>
                <span class="text-5xl sm:text-6xl font-black tracking-tight text-slate-900">$32.500</span>
                <span class="text-lg sm:text-xl font-bold text-slate-300 line-through decoration-2">$44.900</span>
                <span class="text-xs sm:text-sm font-bold text-slate-400">COP</span>
              </template>
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

            <!-- Discount code -->
            <div class="mb-5 sm:mb-6">
              <label class="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <svg class="h-3.5 w-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 014 9V4a1 1 0 011-1z"/></svg>
                {{ t('checkout.code_label') }}
              </label>

              <div v-if="!appliedDiscount" class="flex flex-col sm:flex-row gap-2">
                <input
                  v-model="codeInput"
                  type="text"
                  :placeholder="t('checkout.code_placeholder')"
                  :class="codeError ? 'border-red-400 focus:border-red-500' : 'border-slate-300 focus:border-indigo-500'"
                  class="min-w-0 flex-1 rounded-xl border bg-slate-50 px-3.5 py-2.5 text-sm font-medium uppercase tracking-wide text-slate-900 transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  @input="codeError = false"
                  @keyup.enter="applyCode"
                />
                <button
                  type="button"
                  @click="applyCode"
                  :disabled="codeLoading || !codeInput.trim()"
                  class="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span v-if="codeLoading" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-middle"></span>
                  <span v-else>{{ t('checkout.code_apply') }}</span>
                </button>
              </div>

              <p v-if="codeError && !appliedDiscount" class="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ t('checkout.code_invalid') }}
              </p>

              <div v-if="appliedDiscount" class="flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5">
                <span class="flex min-w-0 items-center gap-2">
                  <svg class="h-4 w-4 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  <span class="truncate text-xs sm:text-sm font-bold text-green-800">{{ appliedDiscount.code }} · −{{ appliedDiscount.discount_percent }}%</span>
                </span>
                <button type="button" @click="removeCode" class="shrink-0 text-xs font-semibold text-green-700 underline hover:text-green-900">{{ t('checkout.code_remove') }}</button>
              </div>
            </div>

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
const toast = useToast()
const loading = ref(false)

const codeInput = ref('')
const codeLoading = ref(false)
const codeError = ref(false)
const appliedDiscount = ref<{ code: string; seller_name: string; discount_percent: number; final_amount: number } | null>(null)

const applyCode = async () => {
  const code = codeInput.value.trim().toUpperCase()
  if (!code || codeLoading.value) return
  codeLoading.value = true
  codeError.value = false
  try {
    const res = await $fetch<any>('/api/checkout/validate-code', { method: 'POST', body: { code } })
    if (res?.valid) {
      appliedDiscount.value = {
        code: res.code,
        seller_name: res.seller_name,
        discount_percent: res.discount_percent,
        final_amount: res.final_amount,
      }
      // Mensaje de confirmación como toast lateral de 10 segundos.
      toast.show(
        t('checkout.code_applied', {
          code: res.code,
          seller: res.seller_name,
          percent: res.discount_percent,
          amount: Number(res.final_amount).toLocaleString('es-CO'),
        }),
        'success',
        10000,
      )
    } else {
      codeError.value = true
    }
  } catch {
    codeError.value = true
  } finally {
    codeLoading.value = false
  }
}

const removeCode = () => {
  appliedDiscount.value = null
  codeInput.value = ''
  codeError.value = false
}

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
      method: 'POST',
      body: { code: appliedDiscount.value?.code || undefined }
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
