<template>
  <NuxtLayout>
    <div>
      <div class="flex justify-between">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('profile.title') }} <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('profile.subtitle') }}</div>
        </div>
        <div class="flex items-center gap-4">
        <div class="text-[11px] font-mono uppercase tracking-widest" :class="hasUnsavedChanges ? 'text-amber' : 'text-text-dim'">
          {{ hasUnsavedChanges ? $t('profile.unsaved_changes') : $t('profile.no_changes') }}
        </div>
        <NuxtLink to="/examen" class="nav-item" active-class="active">
          <AppButton variant="ghost">{{ $t('profile.btn_discover_skills') }}</AppButton>
        </NuxtLink>
        <NuxtLink to="/importar-cv" class="nav-item" active-class="active">
          <AppButton variant="ghost">{{ $t('profile.btn_import_cv') }}</AppButton>
        </NuxtLink>
        </div>
      </div>

      <div class="stats-row grid grid-cols-4 gap-2.5 mb-5">
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ profile.years || 0 }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">{{ $t('profile.stat_years') }}</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ experiences.length }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">{{ $t('profile.stat_entries') }}</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">{{ educations.length }}</div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">{{ $t('profile.stat_studies') }}</div>
        </div>
        <div class="stat-card bg-[var(--bg)]-bg2 border border-border rounded-[5px] p-[14px]">
          <div class="stat-val font-head text-[22px] font-bold text-amber leading-none">
            {{ [...new Set(experiences.flatMap(e => e.skills || []))].length }}
          </div>
          <div class="stat-lbl text-[11px] text-text-dim font-mono mt-1">{{ $t('profile.stat_skills') }}</div>
        </div>
      </div>

      <AppCard :title="$t('profile.section_personal')">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <AppInput :label="$t('profile.label_name')" v-model="profile.nombre" maxlength="50" :placeholder="$t('profile.placeholder_name')" />
          <AppInput :label="$t('profile.label_title')" v-model="profile.titulo" maxlength="30" :placeholder="$t('profile.placeholder_title')" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput :label="$t('profile.label_email')" type="email" v-model="profile.email_profile" placeholder="juan@email.com" />
          <AppInput :label="$t('profile.label_phone')" v-model="profile.telefono" placeholder="+57 321..." />
          <AppInput :label="$t('profile.label_years')" type="number" v-model="profile.years" placeholder="7" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-3">
          <AppInput :label="$t('profile.label_linkedin')" v-model="profile.linkedin" placeholder="linkedin.com/in/..." />
          <AppInput :label="$t('profile.label_web')" v-model="profile.web" placeholder="miweb.com" />
          <AppInput :label="$t('profile.label_other')" v-model="profile.otros" :placeholder="$t('profile.placeholder_other')" />
        </div>
        <div class="grid grid-cols-1 gap-3 mb-3">
          <AppInput :label="$t('profile.label_location')" maxlength="50" v-model="profile.ubicacion" :placeholder="$t('profile.placeholder_location')" />
        </div>
        <AppInput :label="$t('profile.label_summary')" :maxlength="500" type="textarea" v-model="profile.resumen" :placeholder="$t('profile.placeholder_summary')" />
        <AppButton :loading="savingProfile" :disabled="!hasUnsavedChanges" @click="handleManualSave">
          {{ $t('profile.btn_save_changes') }}
        </AppButton>
      </AppCard>

      <AppCard :title="$t('profile.section_education')">
        <template #title-action>
          <div class="ml-auto">
            <AppButton size="sm" @click="toggleEducationForm">
              <span class="material-symbols-outlined text-[16px] mr-1">{{ addingEducation ? 'close' : 'school' }}</span>
              {{ addingEducation ? $t('profile.btn_cancel') : $t('profile.btn_add_study') }}
            </AppButton>
          </div>
        </template>

        <div v-if="addingEducation" class="bg-[var(--bg)]-bg3 border border-amber-dim rounded-[5px] p-4 mb-4">
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">{{ editingEducationId ? $t('profile.lbl_edit_study') : $t('profile.lbl_new_study') }}</div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput :label="$t('profile.label_edu_title')" v-model="newEducation.titulo" placeholder="Ingenieria de Sistemas" />
            <AppInput :label="$t('profile.label_edu_institution')" v-model="newEducation.institucion" placeholder="UNIACC / Universidad X" />
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput :label="$t('profile.label_edu_start')" v-model="newEducation.inicio" placeholder="Ene 2022" />
            <AppInput :label="$t('profile.label_edu_end')" v-model="newEducation.fin" :placeholder="$t('profile.placeholder_edu_end')" />
          </div>
          <AppInput :label="$t('profile.label_edu_desc')" minlength="50" maxlength="1000" type="textarea" v-model="newEducation.descripcion" :placeholder="$t('profile.placeholder_edu_desc')" />

          <div class="flex gap-3">
            <AppButton @click="saveEducation" class="flex-1">{{ editingEducationId ? $t('profile.btn_update_study') : $t('profile.btn_save_study') }}</AppButton>
            <AppButton v-if="editingEducationId" variant="secondary" @click="resetEducationForm">{{ $t('profile.btn_cancel_edit') }}</AppButton>
          </div>
        </div>

        <div v-if="educations.length === 0 && !addingEducation" class="text-center py-10 text-text-dim font-mono text-[12px]">
          {{ $t('profile.empty_education') }}
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
                <div class="text-[11px] text-text-dim font-mono">{{ edu.inicio || $t('profile.lbl_na') }} - {{ edu.fin || $t('profile.lbl_actual') }}</div>
                <div class="flex gap-2 mt-2 justify-end">
                  <AppButton variant="secondary" size="sm" @click="startEditingEducation(edu)">{{ $t('profile.btn_edit') }}</AppButton>
                  <AppButton variant="danger" size="sm" @click="removeEducationEntry(edu.id)">{{ $t('profile.btn_delete') }}</AppButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard :title="$t('profile.section_experience')">
        <template #title-action>
          <div class="ml-auto">
            <AppButton size="sm" @click="toggleExperienceForm">
              <span class="material-symbols-outlined text-[16px] mr-1">{{ adding ? 'close' : 'add' }}</span>
              {{ adding ? $t('profile.btn_cancel') : $t('profile.btn_add') }}
            </AppButton>
          </div>
        </template>

        <div v-if="adding" class="bg-[var(--bg)]-bg3 border border-amber-dim rounded-[5px] p-4 mb-4">
          <div class="font-mono text-[11px] text-amber mb-3 tracking-widest uppercase">{{ editingExpId ? $t('profile.lbl_edit_exp') : $t('profile.lbl_new_exp') }}</div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <AppInput :label="$t('profile.label_exp_type')" type="select" v-model="newExp.type">
              <option value="work">{{ $t('profile.type_work') }}</option>
              <option value="project">{{ $t('profile.type_project') }}</option>
            </AppInput>
            <AppInput :label="newExp.type === 'project' ? $t('profile.label_exp_role_project') : $t('profile.label_exp_role_work')" v-model="newExp.cargo" placeholder="Senior Developer" />
            <AppInput :label="newExp.type === 'project' ? $t('profile.label_exp_company_project') : $t('profile.label_exp_company_work')" v-model="newExp.empresa" :placeholder="$t('profile.placeholder_exp_company')" />
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <AppInput :label="$t('profile.label_exp_start')" v-model="newExp.inicio" placeholder="Ene 2020" />
            <AppInput :label="newExp.type === 'project' ? $t('profile.label_exp_end_project') : $t('profile.label_exp_end_work')" v-model="newExp.fin" placeholder="Dic 2023" />
          </div>

          <AppInput
            :label="newExp.type === 'project' ? $t('profile.label_exp_achievements_project') : $t('profile.label_exp_achievements_work')"
            type="textarea"
            minlength="50"
            maxlength="1000"
            v-model="newExp.logros"
            :placeholder="newExp.type === 'project' ? $t('profile.placeholder_achievements_project') : $t('profile.placeholder_achievements_work')"
          />

          <div class="text-[11px] text-text-dim -mt-2 mb-3 leading-relaxed">
            {{ $t('profile.help_exp_desc') }}
          </div>

          <AppInput :label="$t('profile.label_exp_skills')" v-model="newExp.skills" :placeholder="$t('profile.placeholder_exp_skills')" />

          <div class="text-[11px] text-text-dim mb-3 leading-relaxed">
            {{ $t('profile.help_exp_type') }}
          </div>

          <div class="flex gap-3">
            <AppButton @click="saveExp" class="flex-1">{{ editingExpId ? $t('profile.btn_update_exp') : $t('profile.btn_save_exp') }}</AppButton>
            <AppButton v-if="editingExpId" variant="secondary" @click="resetExpForm">{{ $t('profile.btn_cancel_edit') }}</AppButton>
          </div>
        </div>

        <div v-if="loading" class="text-center py-10">
          <div class="spinner inline-block"></div>
          <div class="text-[12px] text-text-dim font-mono mt-2">{{ $t('profile.loading') }}</div>
        </div>

        <div v-else-if="experiences.length === 0 && !adding" class="text-center py-10 text-text-dim font-mono text-[12px]">
          {{ $t('profile.empty_experience') }}
        </div>

        <div v-else class="space-y-5">
          <section v-if="workExperiences.length">
            <div class="flex items-center justify-between mb-3">
              <div class="text-[12px] font-mono text-amber tracking-widest uppercase">{{ $t('profile.lbl_work_exp') }}</div>
              <div class="text-[11px] text-text-dim font-mono">{{ $t('profile.lbl_entries_count', { count: workExperiences.length }) }}</div>
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
              <div class="text-[12px] font-mono text-sky-500 tracking-widest uppercase">{{ $t('profile.lbl_projects') }}</div>
              <div class="text-[11px] text-text-dim font-mono">{{ $t('profile.lbl_entries_count', { count: projectExperiences.length }) }}</div>
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
        :title="$t('profile.modal_del_title')"
        :confirm-text="$t('profile.modal_del_confirm')"
        :cancel-text="$t('profile.btn_cancel')"
        confirm-variant="primary"
        @close="showConfirmDeleteExp = false"
        @confirm="handleRemoveExperience"
      >
        <p>{{ $t('profile.modal_del_desc') }}</p>
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
const { t } = useI18n()

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
    toast.success(t('profile.toast_save_success'))
  } catch (error) {
    console.error(error)
    toast.error(t('profile.toast_save_error'))
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
    toast.success(t('profile.toast_edu_updated'))
  } else {
    educations.value.unshift({
      id: createLocalId(),
      ...newEducation.value
    })
    toast.success(t('profile.toast_edu_added'))
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
  toast.success(t('profile.toast_edu_deleted'))
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
    toast.error(t('profile.toast_exp_desc_length'))
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
    toast.success(newExp.value.type === 'project' ? t('profile.toast_proj_updated') : t('profile.toast_exp_updated'))
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
    toast.success(newExp.value.type === 'project' ? t('profile.toast_proj_added') : t('profile.toast_exp_added'))
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
    toast.success(t('profile.toast_exp_deleted'))
  }
  showConfirmDeleteExp.value = false
  expToDelete.value = null
}
</script>
