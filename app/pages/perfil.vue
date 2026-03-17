<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Perfil Maestro</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">// Single source of truth · Base de todos tus CVs</div>

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

      <div class="bg-amber/5 border border-amber/20 rounded-lg p-6 mb-8 relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-4xl">auto_fix_high</span>
        </div>
        <div class="max-w-2xl">
          <h2 class="text-amber font-head font-bold text-lg mb-2 flex items-center gap-2">
            Importación Mágica
          </h2>
          <p class="text-[13px] text-text-muted mb-4 leading-relaxed italic">
            Pega el texto de tu LinkedIn o de tu CV actual y deja que la IA llene tu Perfil Maestro por ti en segundos.
          </p>
          <div class="flex flex-col gap-4">
            <div 
              class="border-2 border-dashed border-amber/20 rounded-xl p-8 flex flex-col items-center justify-center bg-amber/5 hover:bg-amber/10 transition-colors cursor-pointer group/upload"
              @click="fileInput?.click()"
            >
              <div class="material-symbols-outlined text-3xl mb-3 group-hover/upload:scale-110 transition-transform text-amber/40">upload_file</div>
              <div class="text-[13px] font-bold text-amber mb-1">Cargar mi CV (PDF)</div>
              <div class="text-[11px] text-text-dim font-mono uppercase tracking-tighter">Click para seleccionar archivo</div>
              <input 
                type="file" 
                ref="fileInput" 
                class="hidden" 
                accept=".pdf,.txt" 
                @change="handleFileChange" 
              />
            </div>
            
            <div v-if="selectedFile" class="flex items-center justify-between bg-dark-bg/60 border border-border px-4 py-2 rounded-lg">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-green text-[20px]">check_circle</span>
                <span class="text-[13px] font-mono text-text-muted">{{ selectedFile.name }}</span>
              </div>
              <AppButton 
                variant="primary" 
                size="sm"
                @click="runMagicImport" 
                :loading="importing"
              >
                🚀 Iniciar Magia
              </AppButton>
            </div>
          </div>
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
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">▸ NUEVA EXPERIENCIA</div>
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
          <AppButton @click="saveExp">Guardar experiencia</AppButton>
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
          @remove="removeExperience"
        />
      </AppCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
const { profile, experiences, loading, fetchProfile, saveProfile, addExperience, removeExperience, bulkExperience } = useAppState()
const toast = useToast()

const adding = ref(false)
const importing = ref(false)
const initialized = ref(false)
const selectedFile = ref(null)
const fileInput = ref(null)

const handleFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    selectedFile.value = file
  }
}

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
  addExperience(newExp.value)
  newExp.value = { cargo: '', empresa: '', inicio: '', fin: '', logros: '', skills: '' }
  adding.value = false
}

const runMagicImport = async () => {
  if (!selectedFile.value) return
  importing.value = true
  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const data = await $fetch('/api/import', {
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
</script>
