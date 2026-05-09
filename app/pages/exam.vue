<template>
  <NuxtLayout>
    <div class="max-w-3xl mx-auto py-4">
      <div class="mb-6">
        <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ t('examen.title') }} <HelpButton /></div>
        <div class="page-sub text-[13px] text-text-dim mb-2 font-mono">
        {{ t('examen.subtitle') }}
        </div>
      </div>

      <AppCard v-if="visibleResult">
        <button
          type="button"
          class="w-full flex items-start justify-between gap-4 text-left"
          @click="toggleResultAccordion"
        >
          <div>
            <div class="card-title font-head text-[14px] font-semibold mb-2 text-text flex items-center gap-2">
              <span class="w-[3px] h-[14px] bg-amber rounded-sm"></span>
              {{ result ? t('examen.result_latest') : t('examen.result_previous') }}
            </div>
            <div class="text-[17px] font-head font-bold text-text tracking-tight">{{ translatedProfileLabel(visibleResult.profile_label) }}</div>
            <div v-if="visibleResult.completed_at" class="text-[11px] text-text-dim font-mono mt-1">
              {{ t('examen.last_attempt', { date: formatDate(visibleResult.completed_at) }) }}
            </div>
          </div>

          <span class="material-symbols-outlined text-text-dim transition-transform duration-200" :class="isResultExpanded ? 'rotate-180' : ''">
            expand_more
          </span>
        </button>

        <div v-if="isResultExpanded" class="flex flex-col gap-4 mt-5">
          <div v-if="visibleResult.confirmed_skills.length">
            <div class="text-[11px] font-mono uppercase tracking-widest text-amber mb-2">{{ t('examen.skills_detected') }}</div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="skill in visibleResult.confirmed_skills"
                :key="skill.key"
                class="px-3 py-1 rounded-full border border-border bg-[var(--bg)]-bg3 text-[12px] text-text"
              >
                {{ t('examen.skill_' + skill.key) }}
              </span>
            </div>
          </div>

          <div class="rounded-[5px] border border-amber/30 bg-amber/10 p-4 text-[13px] text-text leading-relaxed">
           {{ t('examen.result_tip') }}
          </div>

          <div class="flex flex-wrap gap-3">
            <AppButton v-if="result" @click="loadExamData(true)" :loading="loading">{{ t('examen.btn_retry') }}</AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="loading && !questions.length" :title="t('examen.preparing')">
        <div class="text-center py-10">
          <div class="spinner inline-block"></div>
          <div class="text-[12px] text-text-dim font-mono mt-2">{{ t('examen.loading_questions') }}</div>
        </div>
      </AppCard>

      <AppCard v-else-if="loadError && !questions.length" :title="t('examen.load_error_title')">
        <div class="text-[13px] text-text-dim leading-relaxed mb-4">
          {{ loadError }}
        </div>
        <AppButton @click="loadExamData(true)" :loading="loading">{{ t('examen.btn_try_again') }}</AppButton>
      </AppCard>

      <AppCard v-else-if="!result && currentQuestion" :title="t('examen.question_of', { current: currentIndex + 1, total: questions.length })">
        <div class="mb-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="text-[11px] font-mono uppercase tracking-widest text-amber">
              {{ categoryLabel }}
            </div>
            <div class="text-[11px] text-text-dim font-mono">
              {{ t('examen.answered_of', { answered: answeredCount, total: questions.length }) }}
            </div>
          </div>

          <div class="w-full h-2 rounded-full bg-[var(--bg)]-bg3 overflow-hidden mb-4">
            <div class="h-full bg-amber transition-all duration-200" :style="{ width: `${progressPercent}%` }"></div>
          </div>

          <div class="text-[20px] font-head font-bold leading-tight text-text tracking-tight mb-5">
            {{ t('examen.' + currentQuestion.id) }}
          </div>

          <div class="space-y-3">
            <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              type="button"
              class="w-full text-left rounded-[5px] border p-4 transition-all"
              :class="answers[currentQuestion.id] === option.id
                ? 'border-amber bg-amber/10 text-text'
                : 'border-border bg-[var(--bg)]-bg3 text-text-dim hover:border-amber/40 hover:text-text'"
              @click="selectOption(currentQuestion.id, option.id)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                  :class="answers[currentQuestion.id] === option.id ? 'border-amber bg-amber text-white' : 'border-border'"
                >
                  <span v-if="answers[currentQuestion.id] === option.id" class="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div class="text-[14px] leading-relaxed">{{ t('examen.' + option.id) }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <AppButton variant="ghost" @click="goToPreviousQuestion" :disabled="currentIndex === 0">{{ t('examen.btn_prev') }}</AppButton>

          <div class="flex flex-wrap gap-3">
            <AppButton
              v-if="!isLastQuestion"
              @click="goToNextQuestion"
              :disabled="!selectedOptionId"
            >
              {{ t('examen.btn_next') }}
            </AppButton>
            <AppButton
              v-else
              @click="submitExam"
              :disabled="answeredCount !== questions.length"
              :loading="submitting"
            >
              {{ t('examen.btn_finish') }}
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { t, locale } = useI18n()

type ExamSkill = {
  key: string
  label: string
  score: number
}

type ExamResult = {
  profile_label: string
  confirmed_skills: ExamSkill[]
  completed_at?: string
}

type ExamQuestion = {
  id: string
  category: string
  text: string
  options: Array<{
    id: string
    text: string
  }>
}

const profileLabelMap: Record<string, string> = {
  'Perfil Estratégico Analítico': 'profile_strategic_analytical',
  'Perfil Líder Colaborativo': 'profile_collaborative_leader',
  'Perfil Ejecutor de Alto Impacto': 'profile_high_impact_executor',
  'Perfil Innovador Adaptativo': 'profile_adaptive_innovator',
  'Perfil Profesional Versátil': 'profile_versatile'
}

const translatedProfileLabel = (label: string) => {
  const key = profileLabelMap[label]
  return key ? t('examen.' + key) : label
}

const toast = useToast()
const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const questions = ref<ExamQuestion[]>([])
const answers = ref<Record<string, string>>({})
const currentIndex = ref(0)
const latestAttempt = ref<ExamResult | null>(null)
const result = ref<ExamResult | null>(null)

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const resultAccordionOpen = ref(false)
const selectedOptionId = computed(() => {
  const question = currentQuestion.value
  return question ? answers.value[question.id] || '' : ''
})
const answeredCount = computed(() => Object.keys(answers.value).length)
const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1)
const progressPercent = computed(() => {
  if (!questions.value.length) return 0
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
})
const categoryLabel = computed(() => {
  const question = currentQuestion.value
  if (!question) return t('examen.cat_default')
  return t('examen.cat_' + question.category, t('examen.cat_default'))
})
const visibleResult = computed(() => result.value || latestAttempt.value)
const isResultExpanded = computed(() => Boolean(result.value) || resultAccordionOpen.value)

const formatDate = (value: string) => {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-CO' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value))
  } catch {
    return value
  }
}

const resetExamState = () => {
  questions.value = []
  answers.value = {}
  currentIndex.value = 0
  result.value = null
  loadError.value = ''
}

const toggleResultAccordion = () => {
  if (result.value) {
    return
  }

  resultAccordionOpen.value = !resultAccordionOpen.value
}

const loadExamData = async (silent = false) => {
  loading.value = true
  loadError.value = ''
  result.value = null

  try {
    const data = await $fetch<{
      questions: ExamQuestion[]
      latest_attempt: ExamResult | null
    }>('/api/exam')

    questions.value = Array.isArray(data.questions) ? data.questions : []
    latestAttempt.value = data.latest_attempt || null
    answers.value = {}
    currentIndex.value = 0
    resultAccordionOpen.value = false

    if (!questions.value.length) {
      loadError.value = t('examen.toast_no_questions')
    } else if (silent) {
      toast.success(t('examen.toast_new_set'))
    }
  } catch (error: any) {
    resetExamState()
    loadError.value = error?.data?.statusMessage || error?.message || t('examen.toast_load_error')
    toast.error(loadError.value)
  } finally {
    loading.value = false
  }
}

const selectOption = (questionId: string, optionId: string) => {
  answers.value = {
    ...answers.value,
    [questionId]: optionId
  }
}

const goToNextQuestion = () => {
  if (!selectedOptionId.value || isLastQuestion.value) {
    return
  }

  currentIndex.value += 1
}

const goToPreviousQuestion = () => {
  if (currentIndex.value === 0) {
    return
  }

  currentIndex.value -= 1
}

const submitExam = async () => {
  if (answeredCount.value !== questions.value.length || !questions.value.length) {
    toast.error(t('examen.toast_answer_all'))
    return
  }

  submitting.value = true

  try {
    const payload = questions.value.map(question => ({
      question_id: question.id,
      option_id: answers.value[question.id]
    }))

    const data = await $fetch<{ result: ExamResult }>('/api/exam', {
      method: 'POST',
      body: {
        answers: payload
      }
    })

    result.value = data.result
    latestAttempt.value = data.result
    questions.value = []
    answers.value = {}
    currentIndex.value = 0
    resultAccordionOpen.value = true
    toast.success(t('examen.toast_saved'))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error: any) {
    toast.error(error?.data?.statusMessage || error?.message || t('examen.toast_save_error'))
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadExamData()
})
</script>

