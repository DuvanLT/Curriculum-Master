<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Próximos Pasos</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Añade y completa tareas que te llevarán al éxito profesional.</div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- LISTA DE TAREAS -->
        <div class="md:col-span-2">
          <AppCard title="Mi Roadmap Profesional">
            <template #title-action>
              <div class="text-[11px] font-mono text-text-dim">
                {{ completedCount }} / {{ steps.length }} completados
              </div>
            </template>

            <div v-if="loading" class="text-center py-10">
              <div class="spinner inline-block"></div>
              <div class="text-[12px] text-text-dim font-mono mt-2">Cargando roadmap...</div>
            </div>

            <div v-else-if="steps.length === 0" class="text-center py-16 border border-dashed border-border rounded-[5px]">
              <span class="material-symbols-outlined text-4xl mb-2 text-text-dim/20">target</span>
              <p class="text-[13px] text-text-dim font-mono">Tu lista aún está vacía.</p>
              <p class="text-[11px] text-text-muted mt-1">Usa el Generador de CV para que la IA cree tareas automáticamente.</p>
            </div>

            <div v-else class="space-y-2">
              <div 
                v-for="step in steps" 
                :key="step.id" 
                class="flex items-center gap-3 p-3 bg-dark-bg3 border border-border rounded-[5px] group transition-all"
                :class="{ 'opacity-60 border-transparent bg-dark-bg2': step.completed }"
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
                    title="Eliminar tarea"
                  >
                    <span class="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              </div>
            </div>
          </AppCard>
        </div>

        <!-- SIDEBAR DE AGREGAR -->
        <div>
          <AppCard title="Nueva Tarea">
            <AppInput 
              placeholder="Ej: Aprender Docker base..." 
              v-model="newStepText" 
              @keyup.enter="addStep"
            />
            <AppButton @click="addStep" class="w-full mt-2" :disabled="!newStepText.trim()">
              Añadir Paso
            </AppButton>
            
            <div class="mt-6 pt-6 border-t border-border-dim">
              <div class="text-[11px] text-amber font-mono mb-2 uppercase tracking-widest flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[14px]">lightbulb</span>
                Tip del Coach
              </div>
              <p class="text-[12px] text-text-dim leading-relaxed">
                Prioriza las tareas que la IA generó específicamente para tus vacantes objetivo. Esas tienen el mayor impacto inmediato en tu empleabilidad.
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
      confirm-text="Eliminar"
      @close="stepToDelete = null"
      @confirm="confirmDelete"
    >
      <template #title>Eliminar Paso</template>
      ¿Estás seguro de que quieres eliminar esta tarea de tu roadmap?
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { profile, experiences } = useAppState()
const toast = useToast()

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
  try {
    const newItem = await $fetch<Step>('/api/steps', {
      method: 'POST',
      body: { text: newStepText.value }
    })
    steps.value.unshift(newItem)
    newStepText.value = ''
    toast.success('Paso añadido correctamente')
  } catch (e) {
    console.error('Error adding step:', e)
    toast.error('Error al añadir el paso')
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
    toast.success('Paso eliminado')
  } catch (e) {
    console.error('Error deleting step:', e)
    toast.error('No se pudo eliminar el paso')
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
