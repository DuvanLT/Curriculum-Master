<template>
  <div class="error-page min-h-dvh bg-[var(--bg)] flex flex-col items-center justify-center px-4 py-12 text-center">
    <!-- Brand -->
    <h1 class="font-head text-[22px] sm:text-[26px] font-bold text-text tracking-tighter mb-12">
      Bring<span class="text-amber">Jobs</span>
    </h1>

    <!-- Torn paper illustration -->
    <div class="relative mb-8">
      <!-- soft glow -->
      <div class="absolute inset-0 blur-2xl opacity-60"
        :style="{ background: 'radial-gradient(circle, color-mix(in srgb, var(--amber) 22%, transparent) 0%, transparent 70%)' }"
      ></div>

      <svg width="160" height="160" viewBox="0 0 140 140" fill="none" class="relative">
        <!-- Top half -->
        <g style="transform: rotate(-4deg); transform-origin: 70px 60px;">
          <path
            d="M37 22 H99 a4 4 0 0 1 4 4 V58
               L95 64 L87 58 L79 64 L71 58 L63 64 L55 58 L47 64 L39 58 L33 64
               V26 a4 4 0 0 1 4 -4 Z"
            fill="var(--bg3)"
            stroke="color-mix(in srgb, var(--text) 18%, var(--border))"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <rect x="44" y="32" width="30" height="5" rx="2.5" fill="var(--amber)" />
          <rect x="44" y="43" width="48" height="3.5" rx="1.75" fill="color-mix(in srgb, var(--text) 28%, transparent)" />
          <rect x="44" y="51" width="38" height="3.5" rx="1.75" fill="color-mix(in srgb, var(--text) 22%, transparent)" />
        </g>

        <!-- Bottom half (torn off, offset and rotated the other way) -->
        <g style="transform: rotate(4deg) translateY(9px); transform-origin: 70px 80px;">
          <path
            d="M33 74 L41 80 L49 74 L57 80 L65 74 L73 80 L81 74 L89 80 L97 74 L103 78
               V112 a4 4 0 0 1 -4 4 H37 a4 4 0 0 1 -4 -4 Z"
            fill="var(--bg3)"
            stroke="color-mix(in srgb, var(--text) 18%, var(--border))"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <rect x="44" y="90" width="44" height="3.5" rx="1.75" fill="color-mix(in srgb, var(--text) 22%, transparent)" />
          <rect x="44" y="99" width="32" height="3.5" rx="1.75" fill="color-mix(in srgb, var(--text) 18%, transparent)" />
        </g>
      </svg>
    </div>

    <!-- Eyebrow with status code -->
    <span class="inline-block text-[11px] font-mono uppercase tracking-[0.2em] text-amber mb-3">
      {{ t('error_page.code_label') }} {{ errorCode }}
    </span>

    <!-- Title + description -->
    <h2 class="font-head text-[24px] sm:text-[28px] font-bold text-text tracking-tight mb-3">
      {{ is404 ? t('error_page.title_404') : t('error_page.title_generic') }}
    </h2>
    <p class="text-[13px] sm:text-[14px] text-text-dim leading-relaxed max-w-[400px] mb-9">
      {{ is404 ? t('error_page.desc_404') : t('error_page.desc_generic') }}
    </p>

    <!-- Actions -->
    <div class="flex flex-row flex-wrap items-center justify-center gap-3 mt-2">
      <AppButton variant="primary" size="lg" class="!h-12 px-7 font-bold" @click="goBack">
        <span class="material-symbols-outlined text-[18px] mr-2">arrow_back</span>
        {{ t('error_page.btn_back') }}
      </AppButton>
      <AppButton variant="ghost" size="lg" class="!h-12 px-7 font-bold" @click="goHome">
        {{ t('error_page.link_home') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const router = useRouter()

const errorCode = computed(() => props.error?.statusCode || 500)
const is404 = computed(() => errorCode.value === 404)

const goBack = () => {
  // Clear the error state, then return to the previous page if there is history.
  clearError()
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const goHome = () => clearError({ redirect: '/' })
</script>

<style scoped>
.error-page {
  background-image:
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}
</style>
