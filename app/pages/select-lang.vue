<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-[var(--bg)] relative overflow-hidden">
    <!-- Blurred Background Overlay -->
    <div class="absolute inset-0 backdrop-blur-sm z-0" style="background: rgba(var(--amber-rgb), 0.04)"></div>

    <!-- Modal Container -->
    <div class="relative z-10 w-full max-w-[500px] border border-border rounded-xl p-8 flex flex-col items-center" style="background: var(--bg2); box-shadow: var(--shadow-soft)">
      <!-- Decorative element -->
      <div class="absolute top-0 right-0 w-40 h-40 bg-amber opacity-5 blur-[100px] -mr-20 -mt-20"></div>

      <!-- Header -->
      <div class="mb-8 text-center w-full relative z-10">
        <h1 class="font-head text-[28px] font-bold text-text tracking-tighter mb-2">
          Bring<span class="text-amber">Jobs</span>
        </h1>
        <p class="font-head text-[20px] font-bold text-text tracking-tight">Select your language</p>
        <p class="text-[14px] text-text-dim mt-1">Selecciona tu idioma</p>
      </div>

      <!-- Language Selection List -->
      <div class="w-full flex flex-col gap-3 mb-8 relative z-10">
        <!-- Español Option -->
        <button
          type="button"
          @click="selectedLocale = 'es'"
          class="w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer"
          :class="selectedLocale === 'es'
            ? 'border-amber bg-amber/5'
            : 'border-border hover:border-amber/40 hover:bg-amber/[0.02]'"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full border flex items-center justify-center text-[13px] font-bold tracking-wider transition-colors duration-200"
              :class="selectedLocale === 'es'
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-border bg-[var(--bg)] text-text-dim'"
            >
              ES
            </div>
            <div class="text-left">
              <p class="text-[14px] font-bold text-text">Español</p>
              <p class="text-[12px] text-text-dim">Spanish</p>
            </div>
          </div>
          <span
            class="material-symbols-outlined text-[22px] transition-colors duration-200"
            :class="selectedLocale === 'es' ? 'text-amber' : 'text-transparent'"
            style="font-variation-settings: 'FILL' 1;"
          >check_circle</span>
        </button>

        <!-- English Option -->
        <button
          type="button"
          @click="selectedLocale = 'en'"
          class="w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer"
          :class="selectedLocale === 'en'
            ? 'border-amber bg-amber/5'
            : 'border-border hover:border-amber/40 hover:bg-amber/[0.02]'"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full border flex items-center justify-center text-[13px] font-bold tracking-wider transition-colors duration-200"
              :class="selectedLocale === 'en'
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-border bg-[var(--bg)] text-text-dim'"
            >
              EN
            </div>
            <div class="text-left">
              <p class="text-[14px] font-bold text-text">English</p>
              <p class="text-[12px] text-text-dim">English</p>
            </div>
          </div>
          <span
            class="material-symbols-outlined text-[22px] transition-colors duration-200"
            :class="selectedLocale === 'en' ? 'text-amber' : 'text-transparent'"
            style="font-variation-settings: 'FILL' 1;"
          >check_circle</span>
        </button>
      </div>

      <!-- Footer Actions -->
      <div class="w-full flex justify-end pt-4 border-t border-border/50 relative z-10">
        <AppButton @click="confirmLocale" class="px-8">
          Confirmar / Confirm
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const { setLocale } = useI18n()
const selectedLocale = ref<'es' | 'en'>('es')

const confirmLocale = () => {
  setLocale(selectedLocale.value)
  localStorage.setItem('preferred-locale', selectedLocale.value)
  navigateTo('/login')
}

// If locale is already set, skip this page
onMounted(() => {
  const saved = localStorage.getItem('preferred-locale')
  if (saved && ['es', 'en'].includes(saved)) {
    navigateTo('/login')
  }
})
</script>

<style scoped>
.auth-page {
  background-image:
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.08) 1px, transparent 0);
  background-size: 32px 32px;
}
</style>
