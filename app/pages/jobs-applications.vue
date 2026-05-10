<template>
  <NuxtLayout>
    <div class="applications-page h-full flex flex-col gap-6 overflow-hidden max-w-full">
      <div class="applications-header flex justify-between items-end flex-shrink-0">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('aplicaciones.title') }} <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('aplicaciones.subtitle') }}</div>
        </div>
        <AppButton @click="handleShowAddModal" variant="primary" class="applications-add-button">
          {{ $t('aplicaciones.new_app_btn') }}
        </AppButton>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="spinner mb-2"></div>
          <div class="text-[12px] text-text-dim font-mono uppercase tracking-widest">{{ $t('aplicaciones.loading_board') }}</div>
        </div>
      </div>

      <!-- Kanban Board Wrapper with edge indicators -->
      <div v-else class="board-shell flex-1 relative overflow-hidden min-w-0 pb-2">
        <!-- Right side indicator gradient -->
        <div class="board-edge-indicator absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-dark-bg to-transparent pointer-events-none z-10 opacity-60"></div>
        
        <div class="board-scroll h-full flex gap-4 overflow-x-auto pb-4 scrollbar-custom min-w-0">
          <div v-for="status in statusOptions" :key="status" 
               class="board-column flex-shrink-0 w-[280px] flex flex-col gap-3">
            
            <!-- Column Header -->
            <div class="board-column-header flex items-center justify-between px-2 mb-1">
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full" :class="statusBg(status)"></div>
                <h3 class="text-[11px] font-mono uppercase tracking-widest text-text-dim">{{ $t(`aplicaciones.status_${status}`) }}</h3>
              </div>
              <span class="text-[10px] font-mono bg-[var(--bg)]-bg3 px-1.5 py-0.5 rounded border border-border text-text-dim">
                {{ groupedApps[status]?.length || 0 }}
              </span>
            </div>
  
            <!-- Column Content -->
            <div class="board-column-body flex-1 bg-[var(--bg)]-bg/20 border border-border/40 rounded-xl p-2 flex flex-col gap-3 min-h-[200px] overflow-y-auto scrollbar-none">
              <div v-for="app in groupedApps[status]" :key="app.id" 
                   class="application-card bg-[var(--bg)]-bg3 border border-border rounded-lg p-4 group hover:border-amber/40 transition-all flex flex-col gap-3 relative shadow-sm">
                
                <div class="application-card-header flex justify-between items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <h4 class="application-company font-bold text-[13px] tracking-tight leading-tight truncate text-text">{{ app.company }}</h4>
                    <p class="application-position text-[11px] text-amber-light font-medium truncate opacity-80">{{ app.position }}</p>
                  </div>
                  <!-- FIXED DELETE BUTTON -->
                  <button 
                    @click.stop="requestDelete(app.id)" 
                    class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-red/10 text-text-dim hover:text-red transition-all"
                    :title="$t('aplicaciones.delete_app_title')"
                  >
                    <span class="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
  
                <!-- Interview Date Display/Edit -->
                <div v-if="app.status === 'Entrevista'" class="flex flex-col gap-2">
                  <div v-if="app.interview_date" class="flex items-center gap-2 bg-amber/10 border border-amber/20 rounded px-2 py-1.5">
                    <span class="material-symbols-outlined text-amber text-[18px]">calendar_month</span>
                    <div class="flex-1">
                      <div class="text-[9px] uppercase font-mono text-amber/60 leading-none mb-0.5">{{ $t('aplicaciones.interview_date') }}</div>
                      <div class="text-[11px] font-bold text-amber">{{ formatDate(app.interview_date) }}</div>
                    </div>
                    <button @click="promptDate(app)" class="material-symbols-outlined text-[14px] text-amber/50 hover:text-amber">edit</button>
                  </div>
                  <button v-else @click="promptDate(app)" class="w-full border border-dashed border-amber/30 rounded py-2 text-[10px] font-mono text-amber/60 hover:bg-amber/5 transition-colors">
                    {{ $t('aplicaciones.schedule_date') }}
                  </button>
                </div>
  
                <div class="application-footer flex items-center justify-between mt-1 pt-3 border-t border-border/40">
                  <div class="application-date text-[10px] text-text-dim font-mono">
                    {{ formatDate(app.date) }}
                  </div>
                  <div class="application-move-actions flex gap-1">
                    <!-- Quick status move -->
                    <button 
                      v-if="canMoveBackward(app.status)" 
                      @click="moveApp(app, -1)"
                      class="w-5 h-5 flex items-center justify-center bg-[var(--bg)]-bg4 border border-border rounded hover:border-amber transition-colors"
                    >
                      <span class="material-symbols-outlined text-[12px]">arrow_back</span>
                    </button>
                    <button 
                      v-if="canMoveForward(app.status)" 
                      @click="moveApp(app, 1)"
                      class="w-5 h-5 flex items-center justify-center bg-[var(--bg)]-bg4 border border-border rounded hover:border-amber transition-colors"
                    >
                      <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
  
              <!-- Empty State for Column -->
              <div v-if="!groupedApps[status]?.length" class="flex-1 flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
                <span class="material-symbols-outlined text-3xl mb-1">inventory_2</span>
                <div class="text-[9px] font-mono uppercase tracking-tighter">{{ $t('aplicaciones.empty_column') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="add-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="add-modal-panel w-full max-w-md rounded-xl p-8 animate-in fade-in zoom-in duration-200">
        <h2 class="text-xl font-bold mb-6 font-head tracking-tight">{{ $t('aplicaciones.modal_new_title') }}</h2>
        <div class="space-y-4">
          <div>
            <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">{{ $t('aplicaciones.company_label') }}</label>
            <AppInput v-model="newApp.company" :placeholder="$t('aplicaciones.company_placeholder')" />
          </div>
          <div>
            <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">{{ $t('aplicaciones.position_label') }}</label>
            <AppInput v-model="newApp.position" :placeholder="$t('aplicaciones.position_placeholder')" />
          </div>
          <div class="modal-grid grid grid-cols-2 gap-4">
            <div>
              <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">{{ $t('aplicaciones.status_label') }}</label>
              <select v-model="newApp.status" class="panel-input">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ $t(`aplicaciones.status_${s}`) }}</option>
              </select>
            </div>
            <div>
              <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">{{ $t('aplicaciones.app_date_label') }}</label>
              <input type="date" v-model="newApp.date" class="panel-input" />
            </div>
          </div>
          <!-- Conditional Interview Date in Modal -->
          <div v-if="newApp.status === 'Entrevista'" class="animate-in slide-in-from-top-2 duration-200">
            <label class="text-[11px] text-amber uppercase font-mono mb-1.5 block font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">target</span>
              {{ $t('aplicaciones.interview_date_label') }}
            </label>
            <input type="date" v-model="newApp.interview_date" class="panel-input panel-input-accent" />
          </div>
        </div>
        <div class="modal-actions flex gap-3 mt-8">
          <AppButton class="flex-1" variant="secondary" @click="showAddModal = false">{{ $t('aplicaciones.cancel') }}</AppButton>
          <AppButton class="flex-1" variant="primary" @click="addNewApp" :disabled="!newApp.company || !newApp.position">{{ $t('aplicaciones.save') }}</AppButton>
        </div>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <AppModal 
      :show="appToDelete !== null" 
      confirm-variant="danger"
      :confirm-text="$t('aplicaciones.modal_delete_confirm')"
      @close="appToDelete = null"
      @confirm="confirmDelete"
    >
      <template #title>{{ $t('aplicaciones.modal_delete_title') }}</template>
      {{ $t('aplicaciones.modal_delete_text') }}
    </AppModal>

    <!-- Interview Date Edit Modal -->
    <AppModal 
      :show="appToEditDate !== null" 
      :confirm-text="$t('aplicaciones.modal_date_confirm')"
      @close="appToEditDate = null"
      @confirm="saveDate"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-amber">target</span>
          {{ $t('aplicaciones.modal_date_title') }}
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <i18n-t keypath="aplicaciones.modal_date_text" tag="p" class="text-[13px] text-text-muted">
          <template #company>
            <b>{{ appToEditDate?.company }}</b>
          </template>
        </i18n-t>
        <input 
          type="date" 
          v-model="tempDate"
          class="panel-input"
        />
      </div>
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

type ApplicationStatus = 'Pendiente' | 'Aplicado' | 'Entrevista' | 'Oferta' | 'Rechazado'

interface Application {
  id: string
  company: string
  position: string
  status: ApplicationStatus
  date: string
  interview_date: string | null
}

interface NewApplication {
  company: string
  position: string
  status: ApplicationStatus
  date: string
  interview_date: string
}

const applications = ref<Application[]>([])
const loading = ref(false)
const handleShowAddModal = () => {
  if (user.value?.subscription_name !== 'pro') {
    showUpgradeModal.value = true
    return
  }
  showAddModal.value = true
}

const showAddModal = ref(false)
const toast = useToast()
const { user } = useAuth()
const { showUpgradeModal } = useSubscription()
const { t } = useI18n()
const statusOptions: ApplicationStatus[] = ['Pendiente', 'Aplicado', 'Entrevista', 'Oferta', 'Rechazado']

const newApp = ref<NewApplication>({
  company: '',
  position: '',
  status: 'Aplicado',
  date: new Date().toISOString().slice(0, 10),
  interview_date: ''
})

const appToDelete = ref<string | null>(null)
const appToEditDate = ref<Application | null>(null)
const tempDate = ref('')

// Group apps by status for Kanban columns
const groupedApps = computed(() => {
  const groups: Record<string, Application[]> = {}
  statusOptions.forEach(status => {
    groups[status] = applications.value.filter(a => a.status === status)
  })
  return groups
})

const statusBg = (status: ApplicationStatus) => {
  switch (status) {
    case 'Pendiente': return 'bg-text-dim'
    case 'Aplicado': return 'bg-blue'
    case 'Entrevista': return 'bg-amber'
    case 'Oferta': return 'bg-green'
    case 'Rechazado': return 'bg-red'
    default: return 'bg-border'
  }
}

const fetchApps = async () => {
  loading.value = true
  try {
    applications.value = await $fetch<Application[]>('/api/applications')
  } catch (e) {
    console.error('Error fetching applications:', e)
  } finally {
    loading.value = false
  }
}

const addNewApp = async () => {
  try {
    const res = await $fetch<any>('/api/applications', {
      method: 'POST',
      body: newApp.value
    })
    applications.value.unshift(res as Application)
    showAddModal.value = false
    toast.success(t('aplicaciones.toast_add_success', { company: newApp.value.company }))
    newApp.value = {
      company: '',
      position: '',
      status: 'Aplicado',
      date: new Date().toISOString().slice(0, 10),
      interview_date: ''
    }
  } catch (e) {
    console.error('Error saving application:', e)
    toast.error(t('aplicaciones.toast_add_error'))
  }
}

const updateStatus = async (id: string, newStatus: ApplicationStatus, interviewDate: string | null = null) => {
  try {
    const app = applications.value.find(a => a.id === id)
    if (app) {
      app.status = newStatus
      if (interviewDate) app.interview_date = interviewDate
    }
    
    await $fetch<any>('/api/applications', {
      method: 'PATCH',
      body: { 
        id, 
        status: newStatus, 
        interview_date: interviewDate ?? app?.interview_date ?? null
      }
    })
  } catch (e) {
    console.error('Error updating status:', e)
  }
}

const promptDate = (app: Application) => {
  appToEditDate.value = app
  tempDate.value = app.interview_date || new Date().toISOString().slice(0, 10)
}

const saveDate = () => {
  if (appToEditDate.value) {
    updateStatus(appToEditDate.value.id, appToEditDate.value.status, tempDate.value)
    toast.success(t('aplicaciones.toast_date_success'))
    appToEditDate.value = null
  }
}

const moveApp = (app: Application, direction: number) => {
  const currentIndex = statusOptions.indexOf(app.status)
  const nextIndex = currentIndex + direction
  if (nextIndex >= 0 && nextIndex < statusOptions.length) {
    const nextStatus = statusOptions[nextIndex]
    if (nextStatus) {
      updateStatus(app.id, nextStatus)
    }
  }
}

const canMoveBackward = (status: ApplicationStatus) => statusOptions.indexOf(status) > 0
const canMoveForward = (status: ApplicationStatus) => statusOptions.indexOf(status) < statusOptions.length - 1

// FIXED: Using a more robust delete with immediate UI feedback
// NEW DELETE FLOW: Modal-based
const requestDelete = (id: string) => {
  appToDelete.value = id
}

const confirmDelete = async () => {
  if (appToDelete.value === null) return
  
  const id = appToDelete.value
  appToDelete.value = null // Close modal immediately

  // Optimistic UI update
  const originalApps = [...applications.value]
  applications.value = applications.value.filter(a => a.id !== id)

  try {
    await $fetch<any>('/api/applications', {
      method: 'DELETE',
      body: { id }
    })
    toast.success(t('aplicaciones.toast_delete_success'))
  } catch (e) {
    console.error('Error deleting application:', e)
    applications.value = originalApps // Rollback if error
    toast.error(t('aplicaciones.toast_delete_error'))
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

onMounted(fetchApps)
</script>

<style scoped>
.applications-page {
  padding-bottom: 8px;
}

.scrollbar-custom::-webkit-scrollbar {
  height: 8px;
}
.scrollbar-custom::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--bg4) 45%, transparent);
  border-radius: 10px;
}
.scrollbar-custom::-webkit-scrollbar-thumb {
  background: var(--amber);
  border-radius: 10px;
  border: 2px solid var(--bg2);
}
.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: var(--amber2);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.add-modal-overlay {
  background: var(--overlay);
  backdrop-filter: blur(10px);
}

.add-modal-panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.panel-input {
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  color: var(--text);
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;
}

.panel-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px rgba(var(--amber-rgb), 0.14);
}

.panel-input-accent {
  background: color-mix(in srgb, var(--amber-dim) 55%, white);
  border-color: color-mix(in srgb, var(--amber) 20%, var(--border));
}

@media (max-width: 767px) {
  .applications-page {
    gap: 18px;
  }

  .applications-header {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .applications-page .page-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    line-height: 1.15;
  }

  .applications-page .page-sub {
    font-size: 12px;
    line-height: 1.55;
  }

  .applications-add-button {
    width: 100%;
    min-height: 48px;
    justify-content: center;
  }

  .board-shell {
    padding-bottom: 0;
  }

  .board-edge-indicator {
    width: 28px;
    bottom: 0;
  }

  .board-scroll {
    gap: 12px;
    padding-bottom: 10px;
    scroll-snap-type: x proximity;
  }

  .board-column {
    width: min(82vw, 300px);
    scroll-snap-align: start;
    gap: 10px;
  }

  .board-column-header {
    padding-left: 4px;
    padding-right: 4px;
    margin-bottom: 0;
  }

  .board-column-body {
    padding: 10px;
    gap: 10px;
    min-height: 180px;
    border-radius: 14px;
  }

  .application-card {
    padding: 14px;
    border-radius: 12px;
    gap: 12px;
  }

  .application-company,
  .application-position {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }

  .application-company {
    font-size: 14px;
    line-height: 1.35;
  }

  .application-position {
    font-size: 12px;
    line-height: 1.45;
  }

  .application-footer {
    align-items: center;
    gap: 10px;
  }

  .application-date {
    font-size: 9px;
    line-height: 1.3;
  }

  .application-move-actions button {
    width: 26px;
    height: 26px;
  }

  .add-modal-panel {
    padding: 20px 16px;
    border-radius: 16px;
  }

  .modal-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .modal-actions {
    flex-direction: column-reverse;
    margin-top: 20px;
  }

  .modal-actions > * {
    width: 100%;
  }

  .add-modal-panel :deep(.form-group) {
    margin-bottom: 0;
  }

  .add-modal-panel :deep(input) {
    min-height: 50px;
    padding: 14px 12px;
    font-size: 14px;
  }

  .panel-input {
    min-height: 50px;
    padding: 14px 12px;
    font-size: 14px;
  }
}
</style>
