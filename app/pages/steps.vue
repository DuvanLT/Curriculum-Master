<template>
  <NuxtLayout>
    <div class="steps-page">
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('pasos.title') }} <HelpButton /></div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('pasos.subtitle') }}</div>

      <div class="steps-layout grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- LISTA DE TAREAS -->
        <div class="steps-main md:col-span-2">
          <AppCard :title="$t('pasos.roadmap_title')" class="steps-card">
            <template #title-action>
              <div class="steps-progress text-[11px] font-mono text-text-dim">
                {{ $t('pasos.progress_info', { completed: completedCount, total: steps.length, max: MAX_STEPS }) }}
              </div>
            </template>

            <div v-if="loading" class="text-center py-10">
              <div class="spinner inline-block"></div>
              <div class="text-[12px] text-text-dim font-mono mt-2">{{ $t('pasos.loading_roadmap') }}</div>
            </div>

            <div v-else-if="steps.length === 0" class="text-center py-16 border border-dashed border-border rounded-[5px]">
              <span class="material-symbols-outlined text-4xl mb-2 text-text-dim/20">target</span>
              <p class="text-[13px] text-text-dim font-mono">{{ $t('pasos.empty_list_title') }}</p>
              <p class="text-[11px] text-text-muted mt-1">{{ $t('pasos.empty_list_subtitle') }}</p>
            </div>

            <div v-else class="space-y-2 steps-list">
              <div 
                v-for="step in steps" 
                :key="step.id" 
                class="flex items-center gap-3 p-3 bg-[var(--bg)]-bg3 border border-border rounded-[5px] group transition-all"
                :class="{ 'opacity-60 border-transparent bg-[var(--bg)]-bg2': step.completed }"
              >
                <div 
                  @click="toggleStep(step)" 
                  class="w-[18px] h-[18px] border-2 rounded-[3px] flex items-center justify-center cursor-pointer transition-colors"
                  :class="step.completed ? 'bg-amber border-amber' : 'border-border hover:border-amber'"
                >
                  <span v-if="step.completed" class="text-dark-bg font-bold text-[12px]">✓</span>
                </div>
                
                <span class="text-[13px] flex-1" :class="{ 'line-through text-text-dim': step.completed }">
                  {{ step.text }}
                </span>

                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="text-[10px] text-text-muted font-mono whitespace-nowrap">
                    {{ formatDate(step.created_at) }}
                  </div>
                  <button 
                    @click.stop="deleteStep(step.id)" 
                    class="p-1.5 hover:bg-red/10 rounded-full text-red/60 hover:text-red transition-all flex items-center justify-center"
                    :title="$t('pasos.delete_task_title')"
                  >
                    <span class="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              </div>
            </div>
          </AppCard>
        </div>

        <!-- SIDEBAR DE AGREGAR -->
        <div class="steps-sidebar">
          <AppCard :title="$t('pasos.new_task_title')" class="steps-card">
            <AppInput 
              :placeholder="$t('pasos.new_task_placeholder')" 
              v-model="newStepText" 
              @keyup.enter="addStep"
            />
            <AppButton @click="addStep" class="w-full mt-2" :disabled="!newStepText.trim() || steps.length >= MAX_STEPS">
              {{ $t('pasos.add_step_btn') }}
            </AppButton>
            
            <p class="mt-2 text-[11px] font-mono text-text-muted">
              {{ $t('pasos.max_tasks_info', { max: MAX_STEPS }) }}
            </p>
            <div class="mt-6 pt-6 border-t border-border-dim">
              <div class="text-[11px] text-amber font-mono mb-2 uppercase tracking-widest flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[14px]">lightbulb</span>
                {{ $t('pasos.coach_tip_title') }}
              </div>
              <p class="text-[12px] text-text-dim leading-relaxed">
                {{ $t('pasos.coach_tip_text') }}
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <AppModal
      :show="stepToDelete !== null"
      confirm-variant="danger"
      :confirm-text="$t('pasos.modal_delete_confirm')"
      @close="stepToDelete = null"
      @confirm="confirmDelete"
    >
      <template #title>{{ $t('pasos.modal_delete_title') }}</template>
      {{ $t('pasos.modal_delete_text') }}
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user } = useAuth()
const { showUpgradeModal } = useSubscription()
const { profile, experiences } = useAppState()
const toast = useToast()
const { t } = useI18n()
const MAX_STEPS = 40

interface Step {
  id: string;
  text: string;
  completed: boolean;
  created_at?: string;
}

const steps = ref<Step[]>([])
const loading = ref(false)
const newStepText = ref('')
const stepToDelete = ref<string | null>(null)

const fetchSteps = async () => {
  loading.value = true
  try {
    steps.value = await $fetch<Step[]>('/api/steps')
  } catch (e) {
    console.error('Error fetching steps:', e)
  } finally {
    loading.value = false
  }
}

const addStep = async () => {
  if (!newStepText.value.trim()) return
  if (steps.value.length >= MAX_STEPS) {
    toast.warning(t('pasos.toast_max_tasks'))
    return
  }

  try {
    const newItem = await $fetch<Step>('/api/steps', {
      method: 'POST',
      body: { text: newStepText.value.trim() }
    })
    steps.value.unshift(newItem)
    newStepText.value = ''
    toast.success(t('pasos.toast_add_success'))
  } catch (e: any) {
    console.error('Error adding step:', e)
    const message = e?.data?.statusMessage || e?.statusMessage || e?.message || ''
    if (message.includes('maximo de 40 tareas')) {
      toast.warning(t('pasos.toast_max_tasks'))
      return
    }
    toast.error(t('pasos.toast_add_error'))
  }
}

const toggleStep = async (step: Step) => {
  const newStatus = !step.completed
  try {
    // Optimistic UI
    step.completed = newStatus
    await $fetch<any>('/api/steps', {
      method: 'PATCH',
      body: { id: step.id, completed: newStatus }
    })
  } catch (e) {
    step.completed = !newStatus // rollback
    console.error('Error updating step:', e)
  }
}

const deleteStep = (id: string) => {
  stepToDelete.value = id
}

const confirmDelete = async () => {
  if (stepToDelete.value === null) return
  const id = stepToDelete.value
  stepToDelete.value = null

  try {
    await $fetch<any>('/api/steps', {
      method: 'DELETE',
      body: { id }
    })
    const index = steps.value.findIndex((s: Step) => String(s.id) === String(id))
    if (index !== -1) {
      steps.value.splice(index, 1)
    }
    toast.success(t('pasos.toast_delete_success'))
  } catch (e) {
    console.error('Error deleting step:', e)
    toast.error(t('pasos.toast_delete_error'))
  }
}

const completedCount = computed(() => steps.value.filter(s => s.completed).length)

const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

onMounted(fetchSteps)
</script>

<style scoped>
.steps-page {
  display: flex;
  flex-direction: column;
}

.steps-progress {
  margin-left: auto;
  text-align: right;
}

@media (max-width: 767px) {
  .steps-page .page-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    line-height: 1.15;
  }

  .steps-page .page-sub {
    font-size: 12px;
    line-height: 1.55;
    margin-bottom: 18px;
  }

  .steps-layout {
    gap: 16px;
  }

  .steps-card :deep(.card) {
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 0;
  }

  .steps-card :deep(.card-title) {
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
    font-size: 13px;
    line-height: 1.35;
  }

  .steps-progress {
    width: 100%;
    margin-left: 0;
    text-align: left;
    font-size: 10px;
    line-height: 1.5;
  }

  .steps-list {
    gap: 10px;
  }

  .steps-list > .group {
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border-radius: 10px;
  }

  .steps-list > .group > div:first-child {
    width: 22px;
    height: 22px;
    min-width: 22px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .steps-list > .group > span {
    min-width: 0;
    font-size: 14px;
    line-height: 1.6;
  }

  .steps-list > .group > div:last-child {
    opacity: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
  }

  .steps-list > .group > div:last-child > div {
    font-size: 9px;
  }

  .steps-list > .group > div:last-child button {
    width: 30px;
    height: 30px;
  }

  .steps-sidebar :deep(.form-group) {
    margin-bottom: 0;
  }

  .steps-sidebar :deep(input) {
    min-height: 52px;
    padding: 14px 12px;
    font-size: 14px;
  }

  .steps-sidebar :deep(button) {
    min-height: 48px;
  }
}
</style>
