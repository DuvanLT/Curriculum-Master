<template>
  <NuxtLayout>
    <div class="h-full flex flex-col gap-6 overflow-hidden">
      <div class="flex justify-between items-end flex-shrink-0">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Mis Aplicaciones</div>
          <div class="page-sub text-[13px] text-text-dim font-mono">// Seguimiento de procesos · Pipeline de carrera · Conversión de ofertas</div>
        </div>
        <AppButton @click="showAddModal = true" variant="primary">
          + Nueva Aplicación
        </AppButton>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <div class="spinner mb-2"></div>
          <div class="text-[12px] text-text-dim font-mono uppercase tracking-widest">Cargando tablero...</div>
        </div>
      </div>

      <!-- Kanban Board -->
      <div v-else class="flex-1 flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        <div v-for="status in statusOptions" :key="status" 
             class="flex-shrink-0 w-[280px] flex flex-col gap-3">
          
          <!-- Column Header -->
          <div class="flex items-center justify-between px-2 mb-1">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="statusBg(status)"></div>
              <h3 class="text-[11px] font-mono uppercase tracking-widest text-text-dim">{{ status }}</h3>
            </div>
            <span class="text-[10px] font-mono bg-dark-bg3 px-1.5 py-0.5 rounded border border-border text-text-dim">
              {{ groupedApps[status]?.length || 0 }}
            </span>
          </div>

          <!-- Column Content -->
          <div class="flex-1 bg-dark-bg/20 border border-border/40 rounded-xl p-2 flex flex-col gap-3 min-h-[200px] overflow-y-auto scrollbar-none">
            <div v-for="app in groupedApps[status]" :key="app.id" 
                 class="bg-dark-bg3 border border-border rounded-lg p-4 group hover:border-amber/40 transition-all flex flex-col gap-3 relative shadow-sm">
              
              <div class="flex justify-between items-start gap-2">
                <div class="flex-1 min-w-0">
                  <h4 class="font-bold text-[13px] tracking-tight leading-tight truncate text-text">{{ app.company }}</h4>
                  <p class="text-[11px] text-amber-light font-medium truncate opacity-80">{{ app.position }}</p>
                </div>
                <!-- FIXED DELETE BUTTON: Simplified and more prominent -->
                <button 
                  @click.stop="requestDelete(app.id)" 
                  class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-red/10 text-text-dim hover:text-red transition-all"
                  title="Eliminar aplicación"
                >
                  <span class="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>

              <!-- Interview Date Display/Edit -->
              <div v-if="app.status === 'Entrevista'" class="flex flex-col gap-2">
                <div v-if="app.interview_date" class="flex items-center gap-2 bg-amber/10 border border-amber/20 rounded px-2 py-1.5">
                  <span class="material-symbols-outlined text-amber text-[18px]">calendar_month</span>
                  <div class="flex-1">
                    <div class="text-[9px] uppercase font-mono text-amber/60 leading-none mb-0.5">Fecha Entrevista</div>
                    <div class="text-[11px] font-bold text-amber">{{ formatDate(app.interview_date) }}</div>
                  </div>
                  <button @click="promptDate(app)" class="material-symbols-outlined text-[14px] text-amber/50 hover:text-amber">edit</button>
                </div>
                <button v-else @click="promptDate(app)" class="w-full border border-dashed border-amber/30 rounded py-2 text-[10px] font-mono text-amber/60 hover:bg-amber/5 transition-colors">
                  + Programar Fecha
                </button>
              </div>

              <div class="flex items-center justify-between mt-1 pt-3 border-t border-border/40">
                <div class="text-[10px] text-text-dim font-mono">
                  {{ formatDate(app.date) }}
                </div>
                <div class="flex gap-1">
                  <!-- Quick status move -->
                  <button 
                    v-if="canMoveBackward(app.status)" 
                    @click="moveApp(app, -1)"
                    class="w-5 h-5 flex items-center justify-center bg-dark-bg4 border border-border rounded hover:border-amber transition-colors"
                  >
                    <span class="material-symbols-outlined text-[12px]">arrow_back</span>
                  </button>
                  <button 
                    v-if="canMoveForward(app.status)" 
                    @click="moveApp(app, 1)"
                    class="w-5 h-5 flex items-center justify-center bg-dark-bg4 border border-border rounded hover:border-amber transition-colors"
                  >
                    <span class="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State for Column -->
            <div v-if="!groupedApps[status]?.length" class="flex-1 flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
              <span class="material-symbols-outlined text-3xl mb-1">inventory_2</span>
              <div class="text-[9px] font-mono uppercase tracking-tighter">Sin items</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-bg/90 backdrop-blur-sm">
      <div class="bg-dark-bg2 border border-border rounded-xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 class="text-xl font-bold mb-6 font-head tracking-tight">Nueva Aplicación</h2>
        <div class="space-y-4">
          <div>
            <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">Empresa</label>
            <AppInput v-model="newApp.company" placeholder="Ej: Google, Facebook..." />
          </div>
          <div>
            <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">Puesto</label>
            <AppInput v-model="newApp.position" placeholder="Ej: Senior Frontend Dev..." />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">Estado Inicial</label>
              <select v-model="newApp.status" class="w-full bg-dark-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-amber outline-none transition-all">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div>
              <label class="text-[11px] text-text-dim uppercase font-mono mb-1.5 block">Fecha de aplicación</label>
              <input type="date" v-model="newApp.date" class="w-full bg-dark-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-amber outline-none transition-all" />
            </div>
          </div>
          <!-- Conditional Interview Date in Modal -->
          <div v-if="newApp.status === 'Entrevista'" class="animate-in slide-in-from-top-2 duration-200">
            <label class="text-[11px] text-amber uppercase font-mono mb-1.5 block font-bold flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">target</span>
              Fecha de Entrevista
            </label>
            <input type="date" v-model="newApp.interview_date" class="w-full bg-amber/5 border border-amber/30 rounded-lg px-3 py-2 text-sm text-text focus:border-amber outline-none transition-all" />
          </div>
        </div>
        <div class="flex gap-3 mt-8">
          <AppButton class="flex-1" variant="secondary" @click="showAddModal = false">Cancelar</AppButton>
          <AppButton class="flex-1" variant="primary" @click="addNewApp" :disabled="!newApp.company || !newApp.position">Guardar</AppButton>
        </div>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <AppModal 
      :show="appToDelete !== null" 
      confirm-variant="danger"
      confirm-text="Eliminar"
      @close="appToDelete = null"
      @confirm="confirmDelete"
    >
      <template #title>Eliminar Aplicación</template>
      ¿Estás seguro de que deseas eliminar esta aplicación? Esta acción no se puede deshacer.
    </AppModal>

    <!-- Interview Date Edit Modal -->
    <AppModal 
      :show="appToEditDate !== null" 
      confirm-text="Guardar Fecha"
      @close="appToEditDate = null"
      @confirm="saveDate"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-amber">target</span>
          Programar Entrevista
        </div>
      </template>
      <div class="flex flex-col gap-4">
        <p class="text-[13px] text-text-muted">Ingresa la fecha para tu entrevista con <b>{{ appToEditDate?.company }}</b>.</p>
        <input 
          type="date" 
          v-model="tempDate"
          class="w-full bg-dark-bg3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:border-amber outline-none transition-all"
        />
      </div>
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const applications = ref<any[]>([])
const loading = ref(false)
const showAddModal = ref(false)
const toast = useToast()
const statusOptions = ['Pendiente', 'Aplicado', 'Entrevista', 'Oferta', 'Rechazado']

const newApp = ref({
  company: '',
  position: '',
  status: 'Aplicado',
  date: new Date().toISOString().split('T')[0],
  interview_date: ''
})

const appToDelete = ref<number | null>(null)
const appToEditDate = ref<any>(null)
const tempDate = ref('')

// Group apps by status for Kanban columns
const groupedApps = computed(() => {
  const groups = {}
  statusOptions.forEach(status => {
    groups[status] = applications.value.filter(a => a.status === status)
  })
  return groups
})

const statusBg = (status) => {
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
    applications.value = await $fetch('/api/applications')
  } catch (e) {
    console.error('Error fetching applications:', e)
  } finally {
    loading.value = false
  }
}

const addNewApp = async () => {
  try {
    const res = await $fetch('/api/applications', {
      method: 'POST',
      body: newApp.value
    })
    applications.value.unshift(res)
    showAddModal.value = false
    toast.success(`Aplicación para ${newApp.value.company} guardada.`)
    newApp.value = {
      company: '',
      position: '',
      status: 'Aplicado',
      date: new Date().toISOString().split('T')[0],
      interview_date: ''
    }
  } catch (e) {
    console.error('Error saving application:', e)
    toast.error('Error al guardar la aplicación')
  }
}

const updateStatus = async (id, newStatus, interviewDate = null) => {
  try {
    const app = applications.value.find(a => a.id === id)
    if (app) {
      app.status = newStatus
      if (interviewDate) app.interview_date = interviewDate
    }
    
    await $fetch('/api/applications', {
      method: 'PATCH',
      body: { 
        id, 
        status: newStatus, 
        interview_date: interviewDate || app?.interview_date 
      }
    })
  } catch (e) {
    console.error('Error updating status:', e)
  }
}

const promptDate = (app: any) => {
  appToEditDate.value = app
  tempDate.value = app.interview_date || new Date().toISOString().split('T')[0]
}

const saveDate = () => {
  if (appToEditDate.value) {
    updateStatus(appToEditDate.value.id, appToEditDate.value.status, tempDate.value)
    toast.success('Fecha de entrevista actualizada')
    appToEditDate.value = null
  }
}

const moveApp = (app, direction) => {
  const currentIndex = statusOptions.indexOf(app.status)
  const nextIndex = currentIndex + direction
  if (nextIndex >= 0 && nextIndex < statusOptions.length) {
    const nextStatus = statusOptions[nextIndex]
    updateStatus(app.id, nextStatus)
  }
}

const canMoveBackward = (status) => statusOptions.indexOf(status) > 0
const canMoveForward = (status) => statusOptions.indexOf(status) < statusOptions.length - 1

// FIXED: Using a more robust delete with immediate UI feedback
// NEW DELETE FLOW: Modal-based
const requestDelete = (id: number) => {
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
    await $fetch('/api/applications', {
      method: 'DELETE',
      body: { id }
    })
    toast.success('Aplicación eliminada.')
  } catch (e) {
    console.error('Error deleting application:', e)
    applications.value = originalApps // Rollback if error
    toast.error('No se pudo eliminar la aplicación.')
  }
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

onMounted(fetchApps)
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: var(--amber-dim);
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
