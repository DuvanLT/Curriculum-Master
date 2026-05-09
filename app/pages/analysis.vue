<template>
  <NuxtLayout>
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
      <!-- Main Column -->
      <div>
        <div class="page-title analysis-title font-head text-[22px] font-bold mb-1 tracking-tighter">
          <span>{{ $t('analisis.title') }}</span>
          <HelpButton />
        </div>

        <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('analisis.subtitle') }}</div>

        <AppCard :title="$t('analisis.card_title')">
          <AppInput
            type="textarea"
            v-model="jd"
            :rows="6"
            :placeholder="$t('analisis.placeholder')"
          />
          <div class="flex gap-2 mt-3">
            <AppButton @click="runAIMatch" :disabled="loading || !jd.trim()">
              <span v-if="loading" class="spinner mr-2"></span>
              <span v-else class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
              {{ $t('analisis.btn_analyze') }}
            </AppButton>
          </div>
        </AppCard>

        <AppCard v-if="skills.length > 0" :title="$t('analisis.hard_skills_title')">
          <div class="font-mono text-[11px] text-text-dim mb-3">{{ $t('analisis.hard_skills_subtitle') }}</div>
          <div v-for="skill in skills.slice(0, 10)" :key="skill.skill" class="grid grid-cols-[120px_1fr_30px] items-center gap-2.5 mb-2">
            <div class="text-[12px] font-mono text-text-muted">{{ skill.skill }}</div>
            <div class="h-1.5 bg-[var(--bg)]-bg4 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${Math.min(100, skill.count * 25)}%`,
                  background: skill.count >= 3 ? 'var(--green)' : skill.count >= 2 ? 'var(--amber)' : 'var(--text3)'
                }"
              ></div>
            </div>
            <div class="text-[11px] text-text-dim font-mono text-right">{{ skill.count }}x</div>
          </div>
        </AppCard>

        <AppCard v-if="result" :title="$t('analisis.result_title')">
          <div class="flex flex-col sm:grid sm:grid-cols-[auto_1fr] gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left">
            <div class="relative w-[90px] h-[90px] mt-2">
              <svg class="w-full h-full" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--border)" stroke-width="7" />
                <circle
                  cx="45"
                  cy="45"
                  r="38"
                  fill="none"
                  :stroke="scoreColor"
                  stroke-width="7"
                  :stroke-dasharray="`${2 * Math.PI * 38 * result.score / 100} ${2 * Math.PI * 38}`"
                  stroke-linecap="round"
                  transform="rotate(-90 45 45)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <div class="font-head text-[20px] font-bold" :style="{ color: scoreColor }">{{ result.score }}%</div>
                <div class="text-[9px] text-text-dim font-mono">{{ $t('analisis.match') }}</div>
              </div>
            </div>
            <div>
              <div class="mb-5 pb-4 border-b border-border/50">
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-amber uppercase font-mono tracking-widest opacity-70">{{ $t('analisis.detected_company') }}</span>
                  <span class="text-[18px] font-bold text-text">{{ (result.company && result.company !== 'N/A' && result.company !== 'null') ? result.company : $t('analisis.company_not_found') }}</span>
                </div>
                <div class="flex flex-col gap-1 mt-3">
                  <span class="text-[10px] text-amber-light uppercase font-mono tracking-widest opacity-70">{{ $t('analisis.position') }}</span>
                  <span class="text-[14px] text-text-muted">{{ (result.position && result.position !== 'N/A' && result.position !== 'null') ? result.position : $t('analisis.position_not_found') }}</span>
                </div>
              </div>
              <div class="mb-3">
                <div class="text-[12px] text-text-dim font-mono mb-1.5 uppercase opacity-60">{{ $t('analisis.detailed_analysis') }}</div>
                <div class="text-[13px] text-text-muted leading-relaxed">{{ result.analisis }}</div>
              </div>
              <div v-if="result.recomendaciones?.length > 0">
                <div class="text-[12px] text-text-dim font-mono mb-1.5">{{ $t('analisis.recommendations') }}</div>
                <div v-for="(r, i) in result.recomendaciones" :key="i" class="text-[12px] text-text-muted py-1 flex gap-1.5">
                  <span class="text-amber">→</span> {{ r }}
                </div>
              </div>
            </div>
          </div>
          <hr class="border-border my-4" />
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div class="text-[11px] text-green font-mono mb-2 uppercase tracking-wider">{{ $t('analisis.keywords_present') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in result.keywords_presentes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-emerald-500 text-white">
                  {{ k }}
                </span>
              </div>
            </div>
            <div>
              <div class="text-[11px] text-red font-mono mb-2 uppercase tracking-wider">{{ $t('analisis.keywords_missing') }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="k in result.keywords_faltantes" :key="k" class="px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-red-400 text-white">
                  {{ k }}
                </span>
              </div>
            </div>
          </div>
        </AppCard>

        <div v-if="result" class="flex justify-center mt-6">
          <AppButton @click="saveAsApplication" variant="primary" class="!px-10">
            <span class="material-symbols-outlined text-[18px] mr-2">work</span>
            {{ $t('analisis.save_application') }}
          </AppButton>
        </div>
      </div>

      <!-- History Sidebar -->
      <div class="lg:sticky lg:top-6 self-start flex flex-col gap-4">
        <div class="text-[11px] font-mono text-text-dim uppercase tracking-widest pl-2">{{ $t('analisis.recent_analyses') }}</div>
        <div v-if="historyLoading" class="flex justify-center py-8">
          <div class="spinner"></div>
        </div>
        <div v-else-if="history.length === 0" class="bg-[var(--bg)]-bg/20 border border-dashed border-border rounded-xl p-6 text-center">
          <span class="material-symbols-outlined text-text-dim/30 text-3xl mb-2">history</span>
          <div class="text-[11px] text-text-dim font-mono leading-tight">{{ $t('analisis.no_analyses') }}</div>
        </div>
        <div v-else class="flex flex-col gap-2.5">
          <button
            v-for="item in history"
            :key="item.id"
            @click="loadAnalysis(item)"
            class="text-left bg-[var(--bg)]-bg3 border border-border p-3 rounded-lg hover:border-amber/50 transition-all group relative overflow-hidden"
          >
            <div class="absolute top-0 right-0 p-2 opacity-5">
              <span class="material-symbols-outlined text-2xl">description</span>
            </div>
            <div class="text-[11px] font-bold text-text truncate mb-0.5">{{ (item.company && item.company !== 'N/A' && item.company !== 'null') ? item.company : $t('analisis.company_not_found') }}</div>
            <div class="text-[10px] text-amber-light truncate opacity-80 mb-2">{{ (item.position && item.position !== 'N/A' && item.position !== 'null') ? item.position : $t('analisis.position_not_found') }}</div>
            <div class="flex items-center justify-between">
              <div class="text-[9px] font-mono text-text-dim">{{ formatDate(item.created_at) }}</div>
              <div class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg)]-bg4" :style="{ color: getScoreColor(item.score) }">
                {{ item.score }}%
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

interface Skill {
  skill: string
  count: number
}

interface AnalysisResult {
  score: number
  company: string
  position: string
  keywords_presentes: string[]
  keywords_faltantes: string[]
  hard_skills_top: string[]
  analisis: string
  recomendaciones: string[]
}

interface HistoryItem {
  id: number
  company: string
  position: string
  jd_text: string
  analysis: any
  score: number
  created_at: string
}

const { profile, experiences, ensureProfileLoaded, loading: profileLoading } = useAppState()
const toast = useToast()
const { t, locale } = useI18n()

const jd = ref('')
const result = ref<AnalysisResult | null>(null)
const skills = ref<Skill[]>([])
const loading = ref(false)
const history = ref<HistoryItem[]>([])
const historyLoading = ref(false)
const showHelp = ref(false)
const { currentSectionHelp, requestSidebarTour } = useNavigationHelp()

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    history.value = await $fetch<HistoryItem[]>('/api/analyses')
  } catch (e) {
    console.error('Error fetching history:', e)
  } finally {
    historyLoading.value = false
  }
}

const loadAnalysis = (item: HistoryItem) => {
  jd.value = item.jd_text
  const data = item.analysis
  result.value = {
    score: data.score,
    company: data.company,
    position: data.position,
    keywords_presentes: data.keywords_presentes,
    keywords_faltantes: data.keywords_faltantes,
    hard_skills_top: data.hard_skills_jd?.slice(0, 5).map((s: any) => s.skill) || [],
    analisis: data.analisis,
    recomendaciones: data.recomendaciones
  }
  skills.value = data.hard_skills_jd || []
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  fetchHistory()
  const route = useRoute()
  if (route.query.jd) {
    jd.value = route.query.jd as string
  }
})

const runAIMatch = async () => {
  await ensureProfileLoaded()

  if (profileLoading.value) {
    toast.error(t('analisis.toast_loading_profile'))
    return
  }

  if (!jd.value.trim() || !profile.value.nombre) {
    toast.error(t('analisis.toast_complete_profile'))
    return
  }

  loading.value = true

  try {
    const data = await $fetch<any>('/api/analyze', {
      method: 'POST',
      body: {
        jd: jd.value,
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })

    result.value = {
      score: data.score,
      company: data.company,
      position: data.position,
      keywords_presentes: data.keywords_presentes,
      keywords_faltantes: data.keywords_faltantes,
      hard_skills_top: data.hard_skills_jd.slice(0, 5).map((s: any) => s.skill),
      analisis: data.analisis,
      recomendaciones: data.recomendaciones
    }
    skills.value = data.hard_skills_jd
    fetchHistory()
  } catch (e: any) {
    console.error('Error in AI Analysis:', e)
    toast.error(t('analisis.toast_analysis_error'))
  } finally {
    loading.value = false
  }
}

const scoreColor = computed(() => {
  if (!result.value) return 'var(--text3)'
  if (result.value.score >= 70) return 'var(--green)'
  if (result.value.score >= 45) return 'var(--amber)'
  return 'var(--red)'
})

const saveAsApplication = async () => {
  if (!result.value) return

  try {
    await $fetch<any>('/api/applications', {
      method: 'POST',
      body: {
        company: (result.value.company && result.value.company !== 'N/A' && result.value.company !== 'null') ? result.value.company : t('analisis.unknown_company'),
        position: (result.value.position && result.value.position !== 'N/A' && result.value.position !== 'null') ? result.value.position : t('analisis.unknown_position'),
        status: t('analisis.status_applied'),
        date: new Date().toISOString().split('T')[0],
        analysis: result.value
      }
    })
    toast.success(t('analisis.toast_app_saved'))
    navigateTo('/jobs-applications')
  } catch (e) {
    console.error(e)
    toast.error(t('analisis.toast_app_error'))
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const getScoreColor = (score: number) => {
  if (score >= 70) return 'var(--green)'
  if (score >= 45) return 'var(--amber)'
  return 'var(--red)'
}
</script>
