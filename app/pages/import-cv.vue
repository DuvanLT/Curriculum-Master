<template>
  <div class="import-page min-h-dvh flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="import-card w-full max-w-[600px] border border-border rounded-xl p-10 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-amber opacity-5 blur-[100px] -mr-32 -mt-32"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-5 blur-[80px] -ml-24 -mb-24"></div>

      <!-- Loading overlay -->
      <div v-if="importing" class="absolute inset-0 z-50 bg-[var(--bg)]-bg2/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div class="magic-loader mb-6">
          <div class="magic-circle"></div>
          <div class="magic-sparkles">
            <span class="material-symbols-outlined text-amber animate-pulse">auto_fix_high</span>
          </div>
        </div>
        <h3 class="text-xl font-bold text-text mb-2 font-head tracking-tight">{{ auditRunning ? t('importar_cv.audit_loading_title') : t('importar_cv.magic_loading_title') }}</h3>
        <p class="text-[13px] text-text-dim font-mono max-w-[320px]">{{ auditRunning ? t('importar_cv.audit_loading_desc') : t('importar_cv.magic_loading_desc') }}</p>
      </div>

      <!-- Audit Result Screen -->
      <div v-if="auditResult && !importing" class="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-400">
        <div class="text-center mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
            :style="{ background: `color-mix(in srgb, ${scoreColor} 12%, var(--bg3))`, border: `2px solid color-mix(in srgb, ${scoreColor} 30%, var(--border))` }"
          >
            <span class="font-head font-bold text-2xl" :style="{ color: scoreColor }">{{ auditResult.score }}</span>
          </div>
          <h2 class="font-head text-2xl font-bold text-text tracking-tight mb-1">{{ t('importar_cv.audit_title') }}</h2>
          <p class="text-[12px] font-mono text-text-dim">{{ t('importar_cv.audit_score_label') }}<span :style="{ color: scoreColor }">{{ scoreLabel }}</span></p>
        </div>

        <div class="grid grid-cols-1 gap-4 mb-6">
          <!-- Fortalezas -->
          <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--green) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--green) 20%, var(--border))">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-symbols-outlined text-[16px]" style="color: var(--green)">thumb_up</span>
              <span class="text-[11px] font-mono uppercase tracking-widest" style="color: var(--green)">{{ t('importar_cv.strengths_title') }}</span>
            </div>
            <ul class="space-y-2">
              <li v-for="(f, i) in auditResult.fortalezas" :key="i" class="flex gap-2 items-start">
                <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style="color: var(--green)">check</span>
                <span class="text-[13px] text-text leading-snug">{{ f }}</span>
              </li>
            </ul>
          </div>

          <!-- Debilidades / Lo que BringJobs mejorara -->
          <div class="rounded-xl p-4 border" style="background: color-mix(in srgb, var(--amber) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--amber) 20%, var(--border))">
            <div class="flex items-center gap-2 mb-3">
              <span class="material-symbols-outlined text-[16px] text-amber">rocket_launch</span>
              <span class="text-[11px] font-mono uppercase tracking-widest text-amber">{{ t('importar_cv.weaknesses_title') }}</span>
            </div>
            <ul class="space-y-2">
              <li v-for="(d, i) in auditResult.debilidades" :key="i" class="flex gap-2 items-start">
                <span class="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0 text-amber">auto_fix_high</span>
                <span class="text-[13px] text-text leading-snug">{{ d }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Recomendacion -->
        <div class="rounded-xl p-4 border mb-6" style="background: color-mix(in srgb, var(--blue) 5%, var(--bg3)); border-color: color-mix(in srgb, var(--blue) 20%, var(--border))">
          <div class="flex gap-2 items-start">
            <span class="material-symbols-outlined text-[18px] flex-shrink-0" style="color: var(--blue)">lightbulb</span>
            <p class="text-[13px] text-text leading-relaxed">{{ auditResult.recomendacion }}</p>
          </div>
        </div>

        <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goToDashboard">
          <span class="material-symbols-outlined text-[18px] mr-2">dashboard</span>
          {{ t('importar_cv.btn_dashboard') }}
        </AppButton>
      </div>

      <div v-if="!auditResult && !cvRejected" class="relative z-10">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-amber text-3xl">auto_fix_high</span>
          </div>
          <div>
            <h1 class="font-head text-2xl font-bold text-text tracking-tight">{{ t('importar_cv.import_title') }}</h1>
            <p class="font-mono text-[11px] text-text-dim tracking-widest">{{ t('importar_cv.import_subtitle') }}</p>
          </div>
        </div>

        <div class="bg-amber/5 border border-amber/20 rounded-xl p-6 mb-8">
          <p class="text-[15px] text-text-muted leading-relaxed">
            {{ t('importar_cv.import_desc_1') }}<span class="text-amber font-bold">{{ t('importar_cv.import_desc_cv') }}</span>{{ t('importar_cv.import_desc_2') }}
          </p>
          <p class="text-[12px] text-text-dim leading-relaxed mt-3">
            {{ t('importar_cv.import_desc_3') }}
          </p>
        </div>

        <div
          class="border-2 border-dashed border-border hover:border-amber/40 rounded-2xl p-12 transition-all cursor-pointer group mb-8 flex flex-col items-center justify-center bg-[var(--bg)]-bg/40 text-center"
          @click="fileInput?.click()"
          :class="{ 'opacity-50 pointer-events-none': importing }"
        >
          <div class="w-16 h-16 bg-[var(--bg)]-bg3 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-4xl text-text-dim group-hover:text-amber">upload_file</span>
          </div>
          <div class="text-[14px] font-bold text-text mb-2">{{ t('importar_cv.upload_text') }}</div>

          <input
            type="file"
            ref="fileInput"
            class="hidden"
            accept=".pdf,.txt"
            @change="handleFileChange"
          />
        </div>

        <div v-if="selectedFile" class="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

        <div class="flex flex-col gap-3">
          <AppButton
            v-if="selectedFile"
            variant="primary"
            size="lg"
            class="w-full !h-14 font-bold text-lg"
            @click="runMagicImport"
            :loading="importing"
          >
            {{ t('importar_cv.btn_start_magic') }}
          </AppButton>

          <button
            v-else
            @click="skipImport"
            class="skip-import-btn w-full h-14 border border-border rounded-xl text-text-dim transition-all text-[14px] font-medium flex items-center justify-center gap-2"
          >
            {{ t('importar_cv.btn_skip') }}
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>

      <div v-if="cvRejected && !importing" class="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-400 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-red/10 border-2 border-red/30">
          <span class="material-symbols-outlined text-3xl text-red">description_off</span>
        </div>
        <h2 class="font-head text-2xl font-bold text-text tracking-tight mb-3">{{ t('importar_cv.cv_rejected_title') }}</h2>
        <p class="text-[14px] text-text-muted leading-relaxed mb-8">{{ t('importar_cv.cv_rejected_desc') }}</p>

        <AppButton variant="primary" size="lg" class="w-full !h-14 font-bold" @click="goCreateFromScratch">
          <span class="material-symbols-outlined text-[18px] mr-2">edit_document</span>
          {{ t('importar_cv.cv_rejected_cta') }}
        </AppButton>

        <button @click="resetRejection" class="mt-4 text-[13px] text-text-dim hover:text-text transition-colors underline">
          {{ t('importar_cv.cv_rejected_retry') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Removed redundant middleware: auth (now global)

interface AuditResult {
  score: number
  fortalezas: string[]
  debilidades: string[]
  recomendacion: string
}

const { mergeImportedProfile, bulkEducation, bulkExperience, saveProfile, profile, experiences } = useAppState()
const toast = useToast()
const { t, locale } = useI18n()

const importing = ref(false)
const auditRunning = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const auditResult = ref<AuditResult | null>(null)
const cvRejected = ref(false)

const goCreateFromScratch = () => {
  navigateTo('/profile')
}

const resetRejection = () => {
  cvRejected.value = false
  selectedFile.value = null
}

const scoreColor = computed(() => {
  const s = auditResult.value?.score ?? 0
  if (s >= 70) return 'var(--green)'
  if (s >= 45) return 'var(--amber)'
  return 'var(--red)'
})

const scoreLabel = computed(() => {
  const s = auditResult.value?.score ?? 0
  if (s >= 70) return t('importar_cv.score_solid')
  if (s >= 45) return t('importar_cv.score_potential')
  return t('importar_cv.score_needs_improvement')
})

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const runMagicImport = async () => {
  if (!selectedFile.value) return
  importing.value = true

  const formData = new FormData()
  formData.append('file', selectedFile.value)
  formData.append('locale', locale.value)

  try {
    const data: any = await $fetch<any>('/api/import', {
      method: 'POST',
      body: formData
    })

    mergeImportedProfile(data)

    if (data.educations?.length > 0) {
      await bulkEducation(data.educations)
    }

    if (data.experiences?.length > 0) {
      await bulkExperience(data.experiences)
    } else {
      await saveProfile()
    }

    // Run CV audit with the freshly imported data
    auditRunning.value = true
    try {
      const audit = await $fetch<AuditResult>('/api/cv-audit', {
        method: 'POST',
        body: {
          profile: profile.value,
          experiences: experiences.value,
          locale: locale.value
        }
      })
      auditResult.value = audit
    } catch (auditErr) {
      console.error('Audit failed, skipping:', auditErr)
      // Audit is optional — don't block the user
      await navigateTo('/dashboard')
    }
  } catch (e: any) {
    console.error(e)
    if (isCvNotReadable(e)) {
      cvRejected.value = true
    } else {
      toast.error(t('importar_cv.toast_error'))
    }
  } finally {
    importing.value = false
    auditRunning.value = false
  }
}

const goToDashboard = () => {
  navigateTo('/dashboard')
}

const skipImport = () => {
  navigateTo('/dashboard')
}
</script>

<style scoped>
.import-page {
  background-image:
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.06) 1px, transparent 0);
  background-size: 40px 40px;
}

.import-card {
  background: var(--bg2);
  box-shadow: var(--shadow-soft);
}

.skip-import-btn:hover {
  background: var(--bg4);
  color: var(--text);
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
