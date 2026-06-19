<template>
  <div class="trial-page min-h-dvh bg-[var(--bg)] py-12 px-4 sm:px-6">
    <div class="max-w-[640px] mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="font-head text-[28px] sm:text-[32px] font-bold text-text tracking-tighter mb-2">
          Bring<span class="text-amber">Jobs</span>
        </h1>
        <h2 class="font-head text-[20px] font-bold text-text mb-1">{{ t('free_trial.title') }}</h2>
        <p class="text-[13px] text-text-dim font-mono">{{ t('free_trial.subtitle') }}</p>
      </div>

      <!-- Status loading -->
      <div v-if="!statusLoaded" class="flex justify-center py-12">
        <div class="spinner"></div>
      </div>

      <template v-else>
        <!-- Already used, nothing left to show -->
        <AppCard v-if="status.importUsed && !auditResult" class="mb-6">
          <div class="text-center py-6">
            <span class="material-symbols-outlined text-amber text-4xl mb-3">lock_clock</span>
            <h3 class="font-head text-lg font-bold text-text mb-2">{{ t('free_trial.already_used_title') }}</h3>
            <p class="text-[13px] text-text-dim mb-5">{{ t('free_trial.already_used_desc') }}</p>
            <AppButton variant="primary" @click="goToSignup">{{ t('free_trial.cta_btn') }}</AppButton>
          </div>
        </AppCard>

        <!-- Upload card -->
        <AppCard v-if="!status.importUsed && !cvRejected" :title="t('free_trial.upload_title')" class="mb-6 relative overflow-hidden">
          <div v-if="importing" class="absolute inset-0 z-10 bg-[var(--bg2)]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <div class="magic-loader mb-6">
              <div class="magic-circle"></div>
              <div class="magic-sparkles">
                <span class="material-symbols-outlined text-amber animate-pulse">auto_fix_high</span>
              </div>
            </div>
            <h3 class="text-lg font-bold text-text mb-2 font-head tracking-tight">{{ t('free_trial.loading_import_title') }}</h3>
            <p class="text-[13px] text-text-dim font-mono max-w-[320px]">{{ t('free_trial.loading_import_desc') }}</p>
          </div>

          <p class="text-[13px] text-text-muted leading-relaxed mb-5">{{ t('free_trial.upload_desc') }}</p>

          <div
            class="border-2 border-dashed border-border hover:border-amber/40 rounded-2xl p-10 transition-all cursor-pointer group mb-5 flex flex-col items-center justify-center bg-[var(--bg)]/40 text-center"
            @click="fileInput?.click()"
            :class="{ 'opacity-50 pointer-events-none': importing }"
          >
            <div class="w-14 h-14 bg-[var(--bg)]-bg3 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <span class="material-symbols-outlined text-3xl text-text-dim group-hover:text-amber">upload_file</span>
            </div>
            <div class="text-[14px] font-bold text-text">{{ t('free_trial.upload_text') }}</div>
            <input type="file" ref="fileInput" class="hidden" accept=".pdf,.txt" @change="handleFileChange" />
          </div>

          <div v-if="selectedFile" class="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div class="flex items-center justify-between bg-[var(--bg)]-bg3 border border-amber/30 p-4 rounded-xl">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green">task_alt</span>
                <span class="text-[13px] font-mono text-text truncate max-w-[250px]">{{ selectedFile.name }}</span>
              </div>
              <button @click="selectedFile = null" class="text-text-dim hover:text-red transition-colors">
                <span class="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <AppButton
            v-if="selectedFile"
            variant="primary"
            size="lg"
            class="w-full !h-14 font-bold text-lg"
            @click="runImport"
            :loading="importing"
          >
            {{ t('free_trial.btn_start') }}
          </AppButton>
        </AppCard>

        <!-- CV rejected -->
        <AppCard v-if="cvRejected && !importing" class="mb-6">
          <div class="text-center py-2">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red/10 border-2 border-red/30">
              <span class="material-symbols-outlined text-3xl text-red">description_off</span>
            </div>
            <h3 class="font-head text-xl font-bold text-text mb-3">{{ t('free_trial.cv_rejected_title') }}</h3>
            <p class="text-[14px] text-text-muted leading-relaxed mb-6">{{ t('free_trial.cv_rejected_desc') }}</p>
            <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goToSignup">
              <span class="material-symbols-outlined text-[18px] mr-2">person_add</span>
              {{ t('free_trial.cv_rejected_cta') }}
            </AppButton>
            <button @click="resetRejection" class="mt-4 text-[13px] text-text-dim hover:text-text transition-colors underline">
              {{ t('free_trial.cv_rejected_retry') }}
            </button>
          </div>
        </AppCard>

        <!-- Audit result -->
        <AppCard v-if="auditResult" :title="t('free_trial.audit_title')" class="mb-6">
          <div class="text-center mb-6">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3"
              :style="{ background: `color-mix(in srgb, ${scoreColor(auditResult.score)} 12%, var(--bg3))`, border: `2px solid color-mix(in srgb, ${scoreColor(auditResult.score)} 30%, var(--border))` }"
            >
              <span class="font-head font-bold text-2xl" :style="{ color: scoreColor(auditResult.score) }">{{ auditResult.score }}</span>
            </div>
            <p class="text-[12px] font-mono text-text-dim">{{ t('free_trial.audit_score_label') }}<span :style="{ color: scoreColor(auditResult.score) }">{{ scoreLabel(auditResult.score) }}</span></p>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--green) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--green) 20%, var(--border))">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[16px]" style="color: var(--green)">thumb_up</span>
                <span class="text-[11px] font-mono uppercase tracking-widest" style="color: var(--green)">{{ t('free_trial.strengths_title') }}</span>
              </div>
              <ul class="space-y-2">
                <li v-for="(f, i) in auditResult.fortalezas" :key="i" class="flex gap-2 items-start">
                  <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style="color: var(--green)">check</span>
                  <span class="text-[13px] text-text leading-snug">{{ f }}</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--amber) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--amber) 20%, var(--border))">
              <div class="flex items-center gap-2 mb-3">
                <span class="material-symbols-outlined text-[16px] text-amber">rocket_launch</span>
                <span class="text-[11px] font-mono uppercase tracking-widest text-amber">{{ t('free_trial.weaknesses_title') }}</span>
              </div>
              <ul class="space-y-2">
                <li v-for="(d, i) in auditResult.debilidades" :key="i" class="flex gap-2 items-start">
                  <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0 text-amber">auto_fix_high</span>
                  <span class="text-[13px] text-text leading-snug">{{ d }}</span>
                </li>
              </ul>
            </div>

            <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--blue) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--blue) 20%, var(--border))">
              <div class="flex gap-2 items-start">
                <span class="material-symbols-outlined text-[18px] flex-shrink-0" style="color: var(--blue)">lightbulb</span>
                <p class="text-[13px] text-text leading-relaxed">{{ auditResult.recomendacion }}</p>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- JD analyze card (one free analysis: hide once used or once a result exists) -->
        <AppCard v-if="status.auditUsed && !status.analyzeUsed && !analysisResult" :title="t('free_trial.jd_card_title')" class="mb-6 relative overflow-hidden">
          <div v-if="analyzing" class="absolute inset-0 z-10 bg-[var(--bg2)]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
            <div class="magic-loader mb-6">
              <div class="magic-circle"></div>
              <div class="magic-sparkles">
                <span class="material-symbols-outlined text-amber animate-pulse">smart_toy</span>
              </div>
            </div>
            <h3 class="text-lg font-bold text-text mb-2 font-head tracking-tight">{{ t('free_trial.loading_analyze_title') }}</h3>
            <p class="text-[13px] text-text-dim font-mono max-w-[320px]">{{ t('free_trial.loading_analyze_desc') }}</p>
          </div>

          <p class="text-[13px] text-text-muted leading-relaxed mb-4">{{ t('free_trial.jd_card_desc') }}</p>

          <AppInput type="textarea" v-model="jd" :rows="6" :placeholder="t('free_trial.jd_placeholder')" />

          <div class="flex gap-2 mt-3">
            <AppButton @click="runAnalyze" :disabled="!jd.trim()" :loading="analyzing">
              <span class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
              {{ t('free_trial.btn_analyze') }}
            </AppButton>
          </div>
        </AppCard>

        <!-- Analysis result -->
        <AppCard v-if="analysisResult" :title="t('free_trial.result_title')" class="mb-6">
          <div class="flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
            <div class="relative w-[90px] h-[90px] mt-2">
              <svg class="w-full h-full" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" stroke-width="7" />
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  fill="none"
                  :stroke="scoreColor(analysisResult.score)"
                  stroke-width="7"
                  :stroke-dasharray="`${2 * Math.PI * 38 * analysisResult.score / 100} ${2 * Math.PI * 38}`"
                  stroke-linecap="round"
                  transform="rotate(-90 45 45)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="font-head text-[20px] font-bold" :style="{ color: scoreColor(analysisResult.score) }">{{ analysisResult.score }}%</div>
                <div class="text-[9px] text-text-dim font-mono">{{ t('free_trial.match') }}</div>
              </div>
            </div>
            <div>
              <div class="mb-5 pb-4 border-b border-border/50">
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-amber uppercase font-mono tracking-widest opacity-70">{{ t('free_trial.position') }}</span>
                  <span class="text-[18px] font-bold text-text">{{ (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : t('free_trial.position_not_found') }}</span>
                </div>
                <div v-if="analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null'" class="flex flex-col gap-1 mt-3">
                  <span class="text-[10px] text-amber-light uppercase font-mono tracking-widest opacity-70">{{ t('free_trial.detected_company') }}</span>
                  <span class="text-[14px] text-text-muted">{{ analysisResult.company }}</span>
                </div>
              </div>
              <div class="mb-3">
                <div class="text-[12px] text-text-dim font-mono mb-1.5 uppercase opacity-60">{{ t('free_trial.detailed_analysis', { score: analysisResult.score }) }}</div>
                <div class="text-[13px] text-text-muted leading-relaxed">{{ analysisResult.analisis }}</div>
              </div>
              <div v-if="analysisResult.recomendaciones?.length > 0">
                <div class="text-[12px] text-text-dim font-mono mb-1.5">{{ t('free_trial.recommendations') }}</div>
                <div v-for="(r, i) in analysisResult.recomendaciones" :key="i" class="text-[12px] text-text-muted py-1 flex gap-1.5">
                  <span class="text-amber">→</span> {{ r }}
                </div>
              </div>
            </div>
          </div>
          <hr class="border-border my-4" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div class="text-[11px] text-green font-mono mb-2 uppercase tracking-wider">{{ t('free_trial.keywords_present') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in analysisResult.keywords_presentes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-emerald-500 text-white">{{ k }}</span>
              </div>
            </div>
            <div>
              <div class="text-[11px] text-red font-mono mb-2 uppercase tracking-wider">{{ t('free_trial.keywords_missing') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in analysisResult.keywords_faltantes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-red-400 text-white">{{ k }}</span>
              </div>
            </div>
          </div>
        </AppCard>

        <!-- Persistent CTA (only after the visitor has uploaded their CV) -->
        <AppCard v-if="status.importUsed" class="mb-6">
          <div class="text-center py-2">
            <h3 class="font-head text-lg font-bold text-text mb-2">{{ t('free_trial.cta_title') }}</h3>
            <p class="text-[13px] text-text-dim mb-5">{{ t('free_trial.cta_desc') }}</p>
            <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goToSignup">
              <span class="material-symbols-outlined text-[18px] mr-2">rocket_launch</span>
              {{ t('free_trial.cta_btn') }}
            </AppButton>
          </div>
        </AppCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

interface AuditResult {
  score: number
  fortalezas: string[]
  debilidades: string[]
  recomendacion: string
}

interface AnalysisResult {
  score: number
  company: string
  position: string
  keywords_presentes: string[]
  keywords_faltantes: string[]
  hard_skills_jd: any[]
  analisis: string
  recomendaciones: string[]
}

const { t, locale } = useI18n()
const toast = useToast()

useSeoMeta({
  title: () => t('seo.free_trial.title'),
  description: () => t('seo.free_trial.description'),
  ogTitle: () => t('seo.free_trial.title'),
  ogDescription: () => t('seo.free_trial.description'),
  ogImage: 'https://bringjobs.qaliby.com/og-image.png',
  ogUrl: 'https://bringjobs.qaliby.com/free-trial',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.free_trial.title'),
  twitterDescription: () => t('seo.free_trial.description'),
  twitterImage: 'https://bringjobs.qaliby.com/og-image.png',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://bringjobs.qaliby.com/free-trial' }
  ]
})

const statusLoaded = ref(false)
const status = ref({ importUsed: false, auditUsed: false, analyzeUsed: false })

const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const cvRejected = ref(false)

const resetRejection = () => {
  cvRejected.value = false
  selectedFile.value = null
  // Limpiar el DOM del input: reseleccionar el mismo archivo no dispara 'change'.
  if (fileInput.value) fileInput.value.value = ''
}

const analyzing = ref(false)

const profile = ref<Record<string, any> | null>(null)
const experiences = ref<any[]>([])
const auditResult = ref<AuditResult | null>(null)
const jd = ref('')
const analysisResult = ref<AnalysisResult | null>(null)

onMounted(async () => {
  try {
    const data = await $fetch<any>('/api/trial/status')
    status.value = {
      importUsed: data.importUsed,
      auditUsed: data.auditUsed,
      analyzeUsed: data.analyzeUsed
    }
    if (data.profile) {
      profile.value = data.profile
      experiences.value = data.experiences || []
    }
    if (data.auditResult) auditResult.value = data.auditResult
    if (data.jdText) jd.value = data.jdText
    if (data.analysisResult) analysisResult.value = data.analysisResult
  } catch (e) {
    console.error('Error fetching trial status:', e)
  } finally {
    statusLoaded.value = true
  }
})

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const runImport = async () => {
  if (!selectedFile.value) return
  importing.value = true

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('locale', locale.value)

  try {
    const data = await $fetch<any>('/api/trial/import', {
      method: 'POST',
      body: formData
    })

    const { educations, experiences: importedExperiences, ...profileFields } = data
    profile.value = profileFields
    experiences.value = importedExperiences || []
    status.value.importUsed = true

    await runAudit()
  } catch (e: any) {
    console.error('Error importing CV:', e)
    if (isCvNotReadable(e)) {
      cvRejected.value = true
    } else if (e?.statusCode === 403) {
      status.value.importUsed = true
    } else {
      toast.error(t('free_trial.toast_error'))
    }
  } finally {
    importing.value = false
  }
}

const runAudit = async () => {
  if (!profile.value) return

  try {
    const audit = await $fetch<AuditResult>('/api/trial/audit', {
      method: 'POST',
      body: {
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    auditResult.value = audit
    status.value.auditUsed = true
  } catch (e: any) {
    console.error('Error auditing CV:', e)
    if (e?.statusCode === 403) {
      status.value.auditUsed = true
    } else {
      toast.error(t('free_trial.toast_audit_error'))
    }
  }
}

const runAnalyze = async () => {
  if (!jd.value.trim() || !profile.value) return
  analyzing.value = true

  try {
    const data = await $fetch<AnalysisResult>('/api/trial/analyze', {
      method: 'POST',
      body: {
        jd: jd.value,
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    analysisResult.value = data
    status.value.analyzeUsed = true
  } catch (e: any) {
    console.error('Error analyzing JD:', e)
    if (e?.statusCode === 403) {
      status.value.analyzeUsed = true
      toast.error(t('free_trial.toast_already_used'))
    } else {
      toast.error(t('free_trial.toast_analysis_error'))
    }
  } finally {
    analyzing.value = false
  }
}

const scoreColor = (score: number) => {
  if (score >= 70) return 'var(--green)'
  if (score >= 45) return 'var(--amber)'
  return 'var(--red)'
}

const scoreLabel = (score: number) => {
  if (score >= 70) return t('free_trial.score_solid')
  if (score >= 45) return t('free_trial.score_potential')
  return t('free_trial.score_needs_improvement')
}

const goToSignup = () => {
  navigateTo('/signup')
}
</script>

<style scoped>
.trial-page {
  background-image:
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}

.magic-loader {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.magic-circle {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(var(--amber-rgb, 255, 191, 0), 0.1);
  border-top: 3px solid var(--amber);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.magic-circle::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px solid var(--amber);
  opacity: 0.2;
  border-radius: 50%;
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.magic-sparkles {
  z-index: 1;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ping {
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
