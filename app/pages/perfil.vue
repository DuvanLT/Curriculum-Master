<template>
  <NuxtLayout>
    <div>
      <div class="flex justify-between">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Perfil Maestro <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Tu perfil maestro debe incluir tu informacion laboral, academica y profesional mas reciente.</div>
        </div>
        <div class="flex items-center gap-4">
        <div class="text-[11px] font-mono uppercase tracking-widest" :class="hasUnsavedChanges ? 'text-amber' : 'text-text-dim'">
          {{ hasUnsavedChanges ? 'Cambios sin guardar' : 'Sin cambios pendientes' }}
        </div>
        <NuxtLink to="/examen" class="nav-item" active-class="active">
          <AppButton variant="ghost">Descubrir habilidades</AppButton>
        </NuxtLink>
        <NuxtLink to="/importar-cv" class="nav-item" active-class="active">
          <AppButton variant="ghost">Importar CV</AppButton>
        </NuxtLink>
        </div>
      </div>

      <div class="stats-row grid grid-cols-4 gap-2.5 mb-5">
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ profile.years || 0 }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">Años de experiencia</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ experiences.length }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">Entradas</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ educations.length }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">Estudios</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">
            {{ [...new Set(experiences.flatMap(e => e.skills || []))].length }}
          </div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">Habilidades únicas</div>
        </div>
      </div>

      <AppCard title="Datos Personales">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <AppInput label="Nombre completo" v-model="profile.nombre" maxlength="50" placeholder="Juan Garcia" />
          <AppInput label="Titulo / Cargo actual" v-model="profile.titulo" maxlength="30" placeholder="Senior Backend Developer" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput label="Email del perfil" type="email" v-model="profile.email_profile" placeholder="juan@email.com" />
          <AppInput label="Telefono" v-model="profile.telefono" placeholder="+57 321..." />
          <AppInput label="Años de experiencia total" type="number" v-model="profile.years" placeholder="7" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput label="LinkedIn (URL)" v-model="profile.linkedin" placeholder="linkedin.com/in/..." />
          <AppInput label="Web / Portafolio" v-model="profile.web" placeholder="miweb.com" />
          <AppInput label="Otra" v-model="profile.otros" placeholder="Tu red social profesional" />
        </div>
        <div class="grid grid-cols-1 gap-3 mb-3">
          <AppInput label="Ubicacion" maxlength="50" v-model="profile.ubicacion" placeholder="Cali, Colombia" />
        </div>
        <AppInput label="Resumen profesional" :maxlength="500" type="textarea" v-model="profile.resumen" placeholder="Desarrollador backend con 7+ años de experiencia..." />
        <AppButton :loading="savingProfile" :disabled="!hasUnsavedChanges" @click="handleManualSave">
          Guardar cambios
        </AppButton>
      </AppCard>

      <AppCard title="Formacion Academica">
        <template #title-action>
          <div class="ml-auto">
            <AppButton size="sm" @click="toggleEducationForm">
              <span class="material-symbols-outlined text-[16px] mr-1">{{ addingEducation ? 'close' : 'school' }}</span>
              {{ addingEducation ? 'Cancelar' : 'Agregar estudio' }}
            </AppButton>
          </div>
        </template>

        <div v-if="addingEducation" class="bg-[var(--bg)]-bg3 border border-amber-dim rounded-[5px] p-4 mb-4">
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">- {{ editingEducationId ? 'EDITAR' : 'NUEVO' }} ESTUDIO</div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput label="Titulo" v-model="newEducation.titulo" placeholder="Ingenieria de Sistemas" />
            <AppInput label="Institucion" v-model="newEducation.institucion" placeholder="UNIACC / Universidad X" />
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput label="Fecha inicio" v-model="newEducation.inicio" placeholder="Ene 2022" />
            <AppInput label="Fecha fin o estado" v-model="newEducation.fin" placeholder="Actual / Dic 2026" />
          </div>
          <AppInput label="Descripcion" minlength="50" maxlength="1000" type="textarea" v-model="newEducation.descripcion" placeholder="Enfasis, grado, proyectos destacados, menciones o contexto adicional..." />

          <div class="flex gap-3">
            <AppButton @click="saveEducation" class="flex-1">{{ editingEducationId ? 'Actualizar' : 'Guardar' }} estudio</AppButton>
            <AppButton v-if="editingEducationId" variant="secondary" @click="resetEducationForm">Cancelar edicion</AppButton>
          </div>
        </div>

        <div v-if="educations.length === 0 && !addingEducation" class="text-center py-10 text-text-dim font-mono text-[12px]">
          No hay estudios registrados. Agrega tu primera formacion academica.
        </div>

        <div v-else class="space-y-3">
          <div v-for="edu in educations" :key="edu.id" class="border border-border rounded-[5px] p-[14px] bg-[var(--bg)]-bg3">
            <div class="flex justify-between gap-4">
              <div>
                <div class="text-[14px] text-text font-medium">{{ edu.titulo }}</div>
                <div class="text-[12px] text-amber font-mono">{{ edu.institucion }}</div>
                <div v-if="edu.descripcion" class="text-[12px] text-text-dim mt-2 leading-relaxed">{{ edu.descripcion }}</div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-[11px] text-text-dim font-mono">{{ edu.inicio || 'N/A' }} - {{ edu.fin || 'Actual' }}</div>
                <div class="flex gap-2 mt-2 justify-end">
                  <AppButton variant="secondary" size="sm" @click="startEditingEducation(edu)">Editar</AppButton>
                  <AppButton variant="danger" size="sm" @click="removeEducationEntry(edu.id)">Eliminar</AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard title="Historial de Experiencias">
        <template #title-action>
          <div class="ml-auto">
            <AppButton size="sm" @click="toggleExperienceForm">
              <span class="material-symbols-outlined text-[16px] mr-1">{{ adding ? 'close' : 'add' }}</span>
              {{ adding ? 'Cancelar' : 'Agregar' }}
            </AppButton>
          </div>
        </template>

        <div v-if="adding" class="bg-[var(--bg)]-bg3 border border-amber-dim rounded-[5px] p-4 mb-4">
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">- {{ editingExpId ? 'EDITAR' : 'NUEVA' }} ENTRADA</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <AppInput label="Tipo" type="select" v-model="newExp.type">
              <option value="work">Experiencia laboral</option>
              <option value="project">Proyecto</option>
            </AppInput>
            <AppInput :label="newExp.type === 'project' ? 'Rol en el proyecto' : 'Cargo / Titulo'" v-model="newExp.cargo" placeholder="Senior Developer" />
            <AppInput :label="newExp.type === 'project' ? 'Nombre del proyecto' : 'Empresa'" v-model="newExp.empresa" placeholder="Empresa S.A.S o nombre del proyecto" />
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput label="Fecha inicio" v-model="newExp.inicio" placeholder="Ene 2020" />
            <AppInput :label="newExp.type === 'project' ? 'Fecha fin o estado' : 'Fecha fin (vacio = actual)'" v-model="newExp.fin" placeholder="Dic 2023" />
          </div>

          <AppInput
            :label="newExp.type === 'project' ? 'Que resolviste o construiste' : 'Logros cuantificables'"
            type="textarea"
            minlength="50"
            maxlength="1000"
            v-model="newExp.logros"
            :placeholder="newExp.type === 'project' ? 'Construyi un dashboard, automatice un flujo, cree un MVP...' : 'Reduje el tiempo de respuesta, mejore procesos, lidere entregas...'"
          />

          <div class="text-[11px] text-text-dim -mt-2 mb-3 leading-relaxed">
            Escribe una descripcion con buen contexto. Lo ideal es superar los 300 caracteres incluyendo problema, responsabilidad, stack, entregable o resultado.
          </div>

          <AppInput label="Habilidades usadas (separadas por coma)" v-model="newExp.skills" placeholder="Ej: Power BI, Analisis, Excel, Python" />

          <div class="text-[11px] text-text-dim mb-3 leading-relaxed">
            Usa "Experiencia laboral" para roles reales en empresa, contrato o freelance continuo. Usa "Proyecto" para portafolio, iniciativa personal, practica academica o entregable puntual.
          </div>

          <div class="flex gap-3">
            <AppButton @click="saveExp" class="flex-1">{{ editingExpId ? 'Actualizar' : 'Guardar' }} entrada</AppButton>
            <AppButton v-if="editingExpId" variant="secondary" @click="resetExpForm">Cancelar edicion</AppButton>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10">
          <div class="spinner inline-block"></div>
          <div class="text-[12px] text-text-dim font-mono mt-2">Cargando perfil...</div>
        </div>

        <div v-else-if="experiences.length === 0 && !adding" class="text-center py-10 text-text-dim font-mono text-[12px]">
          No hay experiencias ni proyectos. Agrega tu primera entrada.
        </div>

        <div v-else class="space-y-5">
          <section v-if="workExperiences.length">
            <div class="flex items-center justify-between mb-3">
              <div class="text-[12px] font-mono text-amber tracking-widest uppercase">Experiencia laboral</div>
              <div class="text-[11px] text-text-dim font-mono">{{ workExperiences.length }} entradas</div>
            </div>

            <ExperienceItem
              v-for="exp in workExperiences"
              :key="exp.id"
              :experience="exp"
              @remove="confirmRemoveExperience"
              @edit="startEditingExperience"
            />
          </section>

          <section v-if="projectExperiences.length">
            <div class="flex items-center justify-between mb-3">
              <div class="text-[12px] font-mono text-sky-500 tracking-widest uppercase">Proyectos</div>
              <div class="text-[11px] text-text-dim font-mono">{{ projectExperiences.length }} entradas</div>
            </div>

            <ExperienceItem
              v-for="exp in projectExperiences"
              :key="exp.id"
              :experience="exp"
              @remove="confirmRemoveExperience"
              @edit="startEditingExperience"
            />
          </section>
        </div>
      </AppCard>

      <AppModal
        :show="showConfirmDeleteExp"
        title="Eliminar Entrada"
        confirm-text="Si, eliminar"
        cancel-text="Cancelar"
        confirm-variant="primary"
        @close="showConfirmDeleteExp = false"
        @confirm="handleRemoveExperience"
      >
        <p>Estas seguro de que quieres eliminar esta entrada? Esta accion no se puede deshacer.</p>
      </AppModal>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { profile, educations, experiences, loading, fetchProfile, saveProfile } = useAppState()
const toast = useToast()

const adding = ref(false)
const addingEducation = ref(false)
const initialized = ref(false)
const savingProfile = ref(false)
const hasUnsavedChanges = ref(false)
const trackUnsavedChanges = ref(true)

const editingExpId = ref<string | number | null>(null)
const editingEducationId = ref<string | number | null>(null)
const showConfirmDeleteExp = ref(false)
const expToDelete = ref<string | number | null>(null)

const emptyEducationForm = () => ({
  titulo: '',
  institucion: '',
  inicio: '',
  fin: '',
  descripcion: ''
})

const emptyExperienceForm = () => ({
  type: 'work' as 'work' | 'project',
  cargo: '',
  empresa: '',
  inicio: '',
  fin: '',
  logros: '',
  skills: ''
})

const newEducation = ref(emptyEducationForm())
const newExp = ref(emptyExperienceForm())

const workExperiences = computed(() => experiences.value.filter(exp => exp.type !== 'project'))
const projectExperiences = computed(() => experiences.value.filter(exp => exp.type === 'project'))

onMounted(async () => {
  await fetchProfile()
  nextTick(() => {
    initialized.value = true
    hasUnsavedChanges.value = false
  })
})

watch([profile, educations, experiences], () => {
  if (!initialized.value || !trackUnsavedChanges.value) return
  hasUnsavedChanges.value = true
}, { deep: true })

const createLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const normalizeSkills = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(skill => String(skill).trim()).filter(Boolean)
  }

  if (typeof value === 'string') {
    return value.split(',').map(skill => skill.trim()).filter(Boolean)
  }

  return []
}

const handleManualSave = async () => {
  if (!hasUnsavedChanges.value || savingProfile.value) {
    return
  }

  savingProfile.value = true
  trackUnsavedChanges.value = false

  try {
    await saveProfile()
    hasUnsavedChanges.value = false
    toast.success('Perfil guardado correctamente')
  } catch (error) {
    console.error(error)
    toast.error('No se pudieron guardar los cambios')
  } finally {
    savingProfile.value = false
    nextTick(() => {
      trackUnsavedChanges.value = true
    })
  }
}

const toggleEducationForm = () => {
  if (addingEducation.value) {
    resetEducationForm()
    return
  }
  addingEducation.value = true
  editingEducationId.value = null
  newEducation.value = emptyEducationForm()
}

const saveEducation = () => {
  if (!newEducation.value.titulo || !newEducation.value.institucion) return

  if (editingEducationId.value) {
    const index = educations.value.findIndex(edu => edu.id === editingEducationId.value)
    if (index !== -1) {
      educations.value[index] = {
        ...educations.value[index],
        ...newEducation.value
      }
    }
    toast.success('Estudio actualizado')
  } else {
    educations.value.unshift({
      id: createLocalId(),
      ...newEducation.value
    })
    toast.success('Estudio agregado')
  }

  resetEducationForm()
}

const resetEducationForm = () => {
  newEducation.value = emptyEducationForm()
  addingEducation.value = false
  editingEducationId.value = null
}

const startEditingEducation = (edu: any) => {
  editingEducationId.value = edu.id
  newEducation.value = {
    titulo: edu.titulo || '',
    institucion: edu.institucion || '',
    inicio: edu.inicio || '',
    fin: edu.fin || '',
    descripcion: edu.descripcion || ''
  }
  addingEducation.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const removeEducationEntry = (id: string | number) => {
  educations.value = educations.value.filter(edu => edu.id !== id)
  toast.success('Estudio eliminado')
}

const toggleExperienceForm = () => {
  if (adding.value) {
    resetExpForm()
    return
  }

  adding.value = true
  editingExpId.value = null
  newExp.value = emptyExperienceForm()
}

const saveExp = () => {
  if (!newExp.value.cargo || !newExp.value.empresa) return

  const normalizedDescription = newExp.value.logros.replace(/\s+/g, ' ').trim()
  if (normalizedDescription.length < 300) {
    toast.error('La descripcion debe tener al menos 300 caracteres para dar suficiente contexto.')
    return
  }

  if (editingExpId.value) {
    const index = experiences.value.findIndex(exp => exp.id === editingExpId.value)
    if (index !== -1) {
      experiences.value[index] = {
        ...experiences.value[index],
        ...newExp.value,
        type: newExp.value.type === 'project' ? 'project' : 'work',
        skills: normalizeSkills(newExp.value.skills)
      }
    }
    toast.success(newExp.value.type === 'project' ? 'Proyecto actualizado' : 'Experiencia actualizada')
  } else {
    experiences.value.unshift({
      id: createLocalId(),
      type: newExp.value.type === 'project' ? 'project' : 'work',
      cargo: newExp.value.cargo,
      empresa: newExp.value.empresa,
      inicio: newExp.value.inicio,
      fin: newExp.value.fin || '',
      logros: newExp.value.logros || '',
      skills: normalizeSkills(newExp.value.skills)
    })
    toast.success(newExp.value.type === 'project' ? 'Proyecto agregado' : 'Experiencia agregada')
  }

  resetExpForm()
}

const resetExpForm = () => {
  newExp.value = emptyExperienceForm()
  adding.value = false
  editingExpId.value = null
}

const startEditingExperience = (exp: any) => {
  editingExpId.value = exp.id
  newExp.value = {
    type: exp.type === 'project' ? 'project' : 'work',
    cargo: exp.cargo,
    empresa: exp.empresa,
    inicio: exp.inicio,
    fin: exp.fin || '',
    logros: exp.logros || '',
    skills: Array.isArray(exp.skills) ? exp.skills.join(', ') : exp.skills
  }
  adding.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const confirmRemoveExperience = (id: string | number) => {
  expToDelete.value = id
  showConfirmDeleteExp.value = true
}

const handleRemoveExperience = () => {
  if (expToDelete.value) {
    experiences.value = experiences.value.filter(exp => exp.id !== expToDelete.value)
    toast.success('Entrada eliminada')
  }
  showConfirmDeleteExp.value = false
  expToDelete.value = null
}
</script>
