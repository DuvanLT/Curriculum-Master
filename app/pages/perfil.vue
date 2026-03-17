<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Perfil Maestro</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Tu perfil maestro debe incluir tu información laboral y profesional más reciente, especialmente en el área en la que estás buscando empleo.</div>

      <div class="stats-row grid grid-cols-3 gap-2.5 mb-5">
        <div class="stat-card bg-dark-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ profile.years || 0 }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">años exp.</div>
        </div>
        <div class="stat-card bg-dark-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ experiences.length }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">posiciones</div>
        </div>
        <div class="stat-card bg-dark-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">
            {{ [...new Set(experiences.flatMap(e => e.skills || []))].length }}
          </div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">skills únicos</div>
        </div>
      </div>

  

      <AppCard title="Datos Personales">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <AppInput label="Nombre completo" v-model="profile.nombre" placeholder="Juan García" />
          <AppInput label="Título / Cargo actual" v-model="profile.titulo" placeholder="Senior Backend Developer" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput label="Email" type="email" v-model="profile.email" placeholder="juan@email.com" />
          <AppInput label="Teléfono" v-model="profile.telefono" placeholder="+57 321..." />
          <AppInput label="Años de experiencia total" type="number" v-model="profile.years" placeholder="7" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput label="LinkedIn (URL)" v-model="profile.linkedin" placeholder="linkedin.com/in/..." />
          <AppInput label="GitHub (URL)" v-model="profile.github" placeholder="github.com/..." />
          <AppInput label="Web / Portafolio" v-model="profile.web" placeholder="miweb.com" />
        </div>
        <AppInput label="Educación (título, institución, año)" v-model="profile.educacion" placeholder="Ing. Sistemas · UNAL · 2017" />
        <AppInput label="Resumen profesional" type="textarea" v-model="profile.resumen" placeholder="Desarrollador backend con 7+ años de experiencia..." />
      </AppCard>

      <AppCard title="Historial de Experiencias">
        <template #title-action>
          <div class="ml-auto">
            <AppButton size="sm" @click="adding = !adding">
              <span class="material-symbols-outlined text-[16px] mr-1">{{ adding ? 'close' : 'add' }}</span>
              {{ adding ? 'Cancelar' : 'Agregar' }}
            </AppButton>
          </div>
        </template>

        <div v-if="adding" class="bg-dark-bg3 border border-amber-dim rounded-[5px] p-4 mb-4">
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">▸ {{ editingExpId ? 'EDITAR' : 'NUEVA' }} EXPERIENCIA</div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput label="Cargo / Título" v-model="newExp.cargo" placeholder="Senior Developer" />
            <AppInput label="Empresa" v-model="newExp.empresa" placeholder="Empresa S.A.S" />
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput label="Fecha inicio" v-model="newExp.inicio" placeholder="Ene 2020" />
            <AppInput label="Fecha fin (vacío = actual)" v-model="newExp.fin" placeholder="Dic 2023" />
          </div>
          <AppInput label="Logros cuantificables" type="textarea" v-model="newExp.logros" placeholder="Reduje el tiempo de respuesta..." />
          <AppInput label="Hard Skills (separadas por coma)" v-model="newExp.skills" placeholder="Python, Django, PostgreSQL, AWS" />
          <div class="flex gap-3">
            <AppButton @click="saveExp" class="flex-1">{{ editingExpId ? 'Actualizar' : 'Guardar' }} experiencia</AppButton>
            <AppButton v-if="editingExpId" variant="secondary" @click="resetExpForm">Cancelar edición</AppButton>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10">
          <div class="spinner inline-block"></div>
          <div class="text-[12px] text-text-dim font-mono mt-2">Cargando perfil...</div>
        </div>

        <div v-else-if="experiences.length === 0 && !adding" class="text-center py-10 text-text-dim font-mono text-[12px]">
          No hay experiencias. Agrega tu primera posición.
        </div>

        <ExperienceItem 
          v-for="exp in experiences" 
          :key="exp.id" 
          :experience="exp" 
          @remove="confirmRemoveExperience"
          @edit="startEditingExperience"
        />
      </AppCard>

      <!-- Delete Experience Confirmation Modal -->
      <AppModal
        :show="showConfirmDeleteExp"
        title="Eliminar Experiencia"
        confirm-text="Si, eliminar"
        cancel-text="Cancelar"
        confirm-variant="primary"
        @close="showConfirmDeleteExp = false"
        @confirm="handleRemoveExperience"
      >
        <p>¿Estás seguro de que quieres eliminar esta experiencia? Esta acción no se puede deshacer.</p>
      </AppModal>

      <!-- Danger Zone -->
      <div class="mt-12 mb-8 border border-red-500/20 bg-red-500/5 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-4">
          <span class="material-symbols-outlined text-red-500">warning</span>
          <h3 class="text-red-500 font-head font-bold text-lg">Zona de Peligro</h3>
        </div>
        <p class="text-[13px] text-text-muted mb-6">
          Al eliminar tu cuenta, todos tus registros (experiencias, aplicaciones, retos y análisis) serán borrados permanentemente. Esta acción no se puede deshacer.
        </p>
        <AppButton 
          variant="secondary" 
          class="!border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-white transition-all"
          @click="showDeleteModal = true"
        >
          Borrar mi cuenta definitivamente
        </AppButton>
      </div>

      <!-- Delete Confirmation Modal -->
      <AppModal
        :show="showDeleteModal"
        :loading="deletingAccount"
        title="Eliminar Cuenta"
        confirm-text="Si, eliminar permanentemente"
        cancel-text="Cancelar"
        confirm-variant="primary"
        @close="showDeleteModal = false"
        @confirm="handleDeleteAccount"
      >
        <p>¿Estás absolutamente seguro? Todos tus datos serán eliminados de nuestros servidores para siempre.</p>
      </AppModal>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
const { profile, experiences, loading, fetchProfile, saveProfile, addExperience, removeExperience, updateExperience, bulkExperience } = useAppState()
const toast = useToast()

const adding = ref(false)
const importing = ref(false)
const initialized = ref(false)
const selectedFile = ref(null)
const showDeleteModal = ref(false)
const deletingAccount = ref(false)

// Experience Editing & Deletion
const editingExpId = ref<string | number | null>(null)
const showConfirmDeleteExp = ref(false)
const expToDelete = ref<string | number | null>(null)

const newExp = ref({
  cargo: '',
  empresa: '',
  inicio: '',
  fin: '',
  logros: '',
  skills: ''
})

onMounted(async () => {
  await fetchProfile()
  // Wait a tick to ensure watch doesn't catch the initial state sync
  nextTick(() => {
    initialized.value = true
  })
})

// Debounced auto-save for profile fields
let saveTimeout = null
watch(profile, () => {
  if (!initialized.value) return
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveProfile()
    toast.success('Perfil autoguardado')
  }, 1000)
}, { deep: true })

const saveExp = () => {
  if (!newExp.value.cargo || !newExp.value.empresa) return
  
  if (editingExpId.value) {
    updateExperience(editingExpId.value, {
      ...newExp.value,
      skills: newExp.value.skills
    })
    toast.success('Experiencia actualizada')
  } else {
    addExperience(newExp.value)
    toast.success('Experiencia agregada')
  }
  
  resetExpForm()
}

const resetExpForm = () => {
  newExp.value = { cargo: '', empresa: '', inicio: '', fin: '', logros: '', skills: '' }
  adding.value = false
  editingExpId.value = null
}

const startEditingExperience = (exp: any) => {
  editingExpId.value = exp.id
  newExp.value = {
    cargo: exp.cargo,
    empresa: exp.empresa,
    inicio: exp.inicio,
    fin: exp.fin || '',
    logros: exp.logros || '',
    skills: Array.isArray(exp.skills) ? exp.skills.join(', ') : exp.skills
  }
  adding.value = true
  // Scroll to form
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const confirmRemoveExperience = (id: string | number) => {
  expToDelete.value = id
  showConfirmDeleteExp.value = true
}

const handleRemoveExperience = () => {
  if (expToDelete.value) {
    removeExperience(expToDelete.value)
    toast.success('Experiencia eliminada')
  }
  showConfirmDeleteExp.value = false
  expToDelete.value = null
}

const runMagicImport = async () => {
  if (!selectedFile.value) return
  importing.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const data = await $fetch<any>('/api/import', {
      method: 'POST',
      body: formData
    })
    
    // Fill main profile
    Object.assign(profile.value, {
      nombre: data.nombre || profile.value.nombre,
      titulo: data.titulo || profile.value.titulo,
      telefono: data.telefono || profile.value.telefono,
      years: data.years?.toString() || profile.value.years,
      linkedin: data.linkedin || profile.value.linkedin,
      github: data.github || profile.value.github,
      web: data.web || profile.value.web,
      educacion: data.educacion || profile.value.educacion,
      resumen: data.resumen || profile.value.resumen
    })
    
    // Add experiences
    if (data.experiences?.length > 0) {
      await bulkExperience(data.experiences)
    }
    
    selectedFile.value = null
    toast.success('¡Perfil importado con éxito desde tu CV!')
  } catch (e) {
    console.error(e)
    toast.error('Error al importar tu perfil. Asegúrate de subir un PDF válido.')
  } finally {
    importing.value = false
  }
}

const handleDeleteAccount = async () => {
  deletingAccount.value = true
  try {
    await $fetch<any>('/api/profile', {
      method: 'DELETE'
    })
    
    toast.success('Cuenta eliminada. Adiós.')
    
    // Redirect to login or home
    await navigateTo('/login')
  } catch (e: any) {
    console.error(e)
    toast.error('Error al intentar eliminar la cuenta: ' + (e.statusMessage || e.message))
  } finally {
    deletingAccount.value = false
    showDeleteModal.value = false
  }
}
</script>
