<template>
  <NuxtLayout>
    <div>
      <div class="generator-hero mb-6">
        <div class="generator-hero-copy">
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('generador.title') }} <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('generador.subtitle') }}</div>
        </div>
        <NuxtLink to="/templates" class="generator-hero-link">
          <AppButton variant="ghost">
            <span class="material-symbols-outlined text-[16px] mr-1">dashboard_customize</span>
            {{ $t('generador.view_templates') }}
          </AppButton>
        </NuxtLink>
      </div>

      <AppCard :title="$t('generador.card_title')">
        <div class="text-[12px] text-text-muted mb-3">
          {{ $t('generador.card_desc') }}
        </div>
        <div class="text-[11px] text-text-dim mb-3 leading-relaxed">
          {{ $t('generador.card_note') }}
        </div>
        <div class="mb-4 p-3 bg-[var(--bg)]-bg3 border border-border rounded-lg">
          <div class="text-[12px] font-semibold text-text-main mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-amber">image</span>
            {{ $t('generador.photo_title') }}
          </div>
          <div class="text-[11px] text-text-dim mb-3">
            <span class="text-amber">{{ $t('generador.photo_note_label') }}</span> {{ $t('generador.photo_note') }}
          </div>
          <div class="flex items-center gap-3">
            <label class="cursor-pointer bg-[var(--bg)]-bg2 hover:bg-border-dim border border-border px-3 py-2 rounded flex items-center gap-2 transition-colors">
              <span class="material-symbols-outlined text-[18px]">upload</span>
              <span class="text-[12px] font-medium">{{ $t('generador.upload_image') }}</span>
              <input type="file" @change="handleImageUpload" accept="image/*" class="hidden">
            </label>
            <div v-if="cvImage" class="relative group">
              <img :src="cvImage" class="w-10 h-10 rounded-full object-cover border border-amber" alt="Preview">
              <button @click="cvImage = undefined" class="absolute -top-1 -right-1 bg-red-500 text-text-dim rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                x
              </button>
            </div>
          </div>
        </div>

        <AppInput
          type="textarea"
          v-model="jd"
          :rows="4"
          :placeholder="$t('generador.placeholder')"
        />
        <div class="flex items-center gap-2 mt-4">
          <AppButton @click="generateAI" :disabled="loading" class="flex-1 sm:flex-none">
            <span v-if="loading" class="spinner mr-2"></span>
            <span v-else class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
            {{ loading ? $t('generador.btn_generating') : $t('generador.btn_generate') }}
          </AppButton>
        </div>
      </AppCard>

      <div v-if="aiResult" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="md:col-span-2">
          <AppCard :title="$t('generador.preview_title')">
            <div class="p-3 bg-[var(--bg)]-bg2 rounded border border-border">
              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                {{ $t('generador.optimized_summary') }}
              </div>
              <p class="text-[13px] text-text-muted leading-relaxed italic mb-4">
                "{{ aiResult.summary }}"
              </p>

              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                {{ $t('generador.top_skills') }}
              </div>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="skill in aiResult.top_skills" :key="skill" class="text-[11px] bg-[var(--bg)]-bg3 border border-border px-2 py-0.5 rounded text-text-dim">
                  {{ skill }}
                </span>
              </div>

              <div v-if="optimizedExperiences.length" class="mt-5">
                <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                  {{ $t('generador.prioritized_experiences') }}
                </div>
                <div v-for="exp in optimizedExperiences" :key="exp.id" class="mb-4 border border-border rounded p-3 bg-[var(--bg)]-bg3">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <div class="text-[13px] font-semibold text-text-main">
                      {{ exp.cargo }} - {{ exp.empresa }}
                    </div>
                  </div>
                  <ul class="space-y-2">
                    <li v-for="(achievement, index) in exp.logros_optimizados || []" :key="index" class="text-[12px] text-text-dim leading-relaxed flex gap-2">
                      <span class="text-amber">-</span>
                      <span>{{ achievement }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </AppCard>
        </div>

        <div>
          <AppCard :title="$t('generador.pro_tips_title')">
            <template #title-icon>
              <span class="material-symbols-outlined text-amber">lightbulb</span>
            </template>
            <ul class="space-y-3">
              <li v-for="(advice, i) in aiResult.advice" :key="i" class="text-[12px] text-text-dim leading-snug flex gap-2">
                <span class="text-amber">-</span> {{ advice }}
              </li>
            </ul>
            <AppButton variant="ghost" class="w-full mt-4 !text-[12px]" @click="exportToPDF">
              <span class="material-symbols-outlined text-[16px] mr-1">download</span>
              {{ $t('generador.download_pdf') }}
            </AppButton>
          </AppCard>
        </div>
      </div>

      <div style="position: absolute; left: -9999px; top: -9999px;">
        <component
          :is="selectedTemplateComponent"
          v-if="aiResult"
          id="pdf-area"
          :profile="profile"
          :educations="educations"
          :experiences="experiences"
          :aiData="aiResult"
          :cvImage="cvImage"
        />
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import CVTemplate from '../components/templates/CVTemplate.vue'
import CVminimalist from '../components/templates/CVminimalist.vue'
import CVdoublecolumn from '../components/templates/CVdoublecolumn.vue'

// Removed redundant middleware: auth (now global)

const { profile, educations, experiences, ensureProfileLoaded, loading: profileLoading } = useAppState()
const toast = useToast()
const { t, locale } = useI18n()
const jd = ref('')
const loading = ref(false)
interface AIExperience {
  id: string | number;
  type: 'work' | 'project';
  cargo: string;
  empresa: string;
  inicio: string;
  fin: string;
  logros_optimizados: string[];
  skills_sugeridas: string[];
  relevance_score?: number;
  relevance_reason?: string;
  focus_for_role?: string;
  metricas_confiables?: string[];
}

interface AIResult {
  summary: string;
  optimized_title: string;
  experiences: AIExperience[];
  top_skills: string[];
  advice: string[];
  next_steps: string[];
}

const aiResult = ref<AIResult | null>(null)
const cvImage = ref<string | undefined>(undefined)

// CV Template selection
const selectedTemplate = ref('classic')
const selectedTemplateComponent = computed(() => {
  if (selectedTemplate.value === 'minimalist') return CVminimalist
  if (selectedTemplate.value === 'doublecolumn') return CVdoublecolumn
  return CVTemplate
})

onMounted(() => {
  const saved = localStorage.getItem('preferred-cv-template')
  if (saved && ['classic', 'minimalist', 'doublecolumn'].includes(saved)) {
    selectedTemplate.value = saved
  }
})

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (cvImage.value) {
      URL.revokeObjectURL(cvImage.value)
    }
    cvImage.value = URL.createObjectURL(file)
  }
}

const optimizedExperiences = computed(() => {
  return Array.isArray(aiResult.value?.experiences) ? aiResult.value.experiences : []
})

onMounted(() => {
  const route = useRoute()
  if (route.query.jd) {
    jd.value = String(route.query.jd)
  }
})

const generateAI = async () => {
  const { canGenerateCV, showUpgradeModal } = useSubscription()

  if (!canGenerateCV.value) {
    showUpgradeModal.value = true
    return
  }

  await ensureProfileLoaded()

  if (profileLoading.value) {
    toast.error(t('generador.toast_loading_profile'))
    return
  }

  if (!profile.value.nombre) {
    toast.error(t('generador.toast_complete_profile'))
    return
  }

  loading.value = true
  try {
    const data = await $fetch('/api/generate-cv', {
      method: 'POST',
      body: {
        profile: profile.value,
        experiences: experiences.value,
        jd: jd.value,
        locale: locale.value
      }
    })
    aiResult.value = data
  } catch (e) {
    console.error('Error generating CV:', e)
    toast.error(t('generador.toast_ai_error'))
  } finally {
    loading.value = false
  }
}

const exportToPDF = async () => {
  if (!aiResult.value) return

  const element = document.getElementById('pdf-area')
  if (!element) {
    toast.error(t('generador.toast_pdf_error'))
    return
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1200')
  if (!printWindow) {
    toast.error(t('generador.toast_popup_blocked'))
    return
  }

  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
  const safeName = (profile.value.nombre || 'CV').replace(/\s+/g, '_')

  // Get all styles from the current document to preserve CSS classes (crucial for CVminimalist)
  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n')

  printWindow.document.open()
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=1024">
        <title>${safeName}_${timeStr}</title>
        ${styles}
        <style>
          @page {
            size: A4;
            margin: 0mm !important;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 210mm;
            height: 297mm;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          * {
            box-sizing: border-box;
          }

          #print-root {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            overflow: hidden;
          }

          #print-root .pdf-container {
            width: 100% !important;
            max-width: 210mm !important;
            height: 297mm !important;
            padding: 12mm 10mm !important;
            margin: 0 auto !important;
            overflow: hidden !important;
          }

          #print-root .pdf-section,
          #print-root .pdf-entry {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @media print {
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
            }

            #print-root {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <div id="print-root">${element.outerHTML}</div>
      </body>
    </html>
  `)
  printWindow.document.close()


  const handleAfterPrint = () => {
    printWindow.close()
  }

  printWindow.addEventListener('afterprint', handleAfterPrint, { once: true })

  setTimeout(() => {
    printWindow.print()
  }, 300)
}
</script>

<style scoped>
.generator-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.generator-hero-copy {
  min-width: 0;
  flex: 1;
}

.generator-hero-link {
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .generator-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .generator-hero-link,
  .generator-hero-link :deep(button) {
    width: 100%;
  }
}
</style>
