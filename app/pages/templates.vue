<template>
  <NuxtLayout>
    <div class="templates-page">
      <div class="templates-hero">
        <div class="templates-copy">
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('profile.section_cv_template') }}</div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('profile.cv_template_subtitle') }}</div>
        </div>
        <NuxtLink to="/generator-cv" class="templates-back-link">
          <AppButton variant="ghost">
            <span class="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            {{ $t('generador.title') }}
          </AppButton>
        </NuxtLink>
      </div>

      <div class="template-grid">
        <div
          class="template-option"
          :class="{ 'template-active': selectedTemplate === 'classic' }"
          @click="selectTemplate('classic')"
        >
          <div class="template-preview-wrapper">
            <div class="template-preview-scaler">
              <CVTemplate
                :profile="previewProfile"
                :educations="previewEducations"
                :experiences="previewExperiences"
                :aiData="previewAiData"
                :cvImage="undefined"
              />
            </div>
            <div class="template-overlay">
              <span class="material-symbols-outlined text-[20px]">visibility</span>
              <span class="text-[11px] font-mono">{{ $t('profile.cv_template_preview') }}</span>
            </div>
          </div>
          <div class="template-info">
            <div class="template-name">
              <span class="material-symbols-outlined text-[16px] mr-1">description</span>
              {{ $t('profile.cv_template_classic') }}
            </div>
            <p class="template-desc">{{ $t('profile.cv_template_classic_desc') }}</p>
            <div class="template-badge" v-if="selectedTemplate === 'classic'">
              <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              {{ $t('profile.cv_template_selected') }}
            </div>
            <div class="template-badge template-badge-ghost" v-else>
              {{ $t('profile.cv_template_select') }}
            </div>
          </div>
        </div>

        <div
          class="template-option"
          :class="{ 'template-active': selectedTemplate === 'minimalist' }"
          @click="selectTemplate('minimalist')"
        >
          <div class="template-preview-wrapper">
            <div class="template-preview-scaler">
              <CVminimalist
                :profile="previewProfile"
                :educations="previewEducations"
                :experiences="previewExperiences"
                :aiData="previewAiData"
                :cvImage="undefined"
              />
            </div>
            <div class="template-overlay">
              <span class="material-symbols-outlined text-[20px]">visibility</span>
              <span class="text-[11px] font-mono">{{ $t('profile.cv_template_preview') }}</span>
            </div>
          </div>
          <div class="template-info">
            <div class="template-name">
              <span class="material-symbols-outlined text-[16px] mr-1">auto_awesome</span>
              {{ $t('profile.cv_template_minimalist') }}
            </div>
            <p class="template-desc">{{ $t('profile.cv_template_minimalist_desc') }}</p>
            <div class="template-badge" v-if="selectedTemplate === 'minimalist'">
              <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              {{ $t('profile.cv_template_selected') }}
            </div>
            <div class="template-badge template-badge-ghost" v-else>
              {{ $t('profile.cv_template_select') }}
            </div>
          </div>
        </div>

        <div
          class="template-option"
          :class="{ 'template-active': selectedTemplate === 'doublecolumn' }"
          @click="selectTemplate('doublecolumn')"
        >
          <div class="template-preview-wrapper">
            <div class="template-preview-scaler">
              <CVdoublecolumn
                :profile="previewProfile"
                :educations="previewEducations"
                :experiences="previewExperiences"
                :aiData="previewAiData"
                :cvImage="undefined"
              />
            </div>
            <div class="template-overlay">
              <span class="material-symbols-outlined text-[20px]">visibility</span>
              <span class="text-[11px] font-mono">{{ $t('profile.cv_template_preview') }}</span>
            </div>
          </div>
          <div class="template-info">
            <div class="template-name">
              <span class="material-symbols-outlined text-[16px] mr-1">view_week</span>
              {{ $t('profile.cv_template_doublecolumn') }}
            </div>
            <p class="template-desc">{{ $t('profile.cv_template_doublecolumn_desc') }}</p>
            <div class="template-badge" v-if="selectedTemplate === 'doublecolumn'">
              <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              {{ $t('profile.cv_template_selected') }}
            </div>
            <div class="template-badge template-badge-ghost" v-else>
              {{ $t('profile.cv_template_select') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import CVTemplate from '../components/templates/CVTemplate.vue'
import CVminimalist from '../components/templates/CVminimalist.vue'
import CVdoublecolumn from '../components/templates/CVdoublecolumn.vue'

definePageMeta({
  middleware: 'auth'
})

const { profile, educations, experiences, ensureProfileLoaded } = useAppState()
const toast = useToast()
const { t } = useI18n()

const selectedTemplate = ref<'classic' | 'minimalist' | 'doublecolumn'>('classic')

const selectTemplate = (template: 'classic' | 'minimalist' | 'doublecolumn') => {
  selectedTemplate.value = template
  localStorage.setItem('preferred-cv-template', template)
  toast.success(t('profile.toast_cv_template_saved'))
}

const mockExperiences = [
  {
    id: 'mock-1',
    type: 'work',
    cargo: 'Senior Full Stack Developer',
    empresa: 'TechCorp Solutions',
    inicio: 'Mar 2021',
    fin: 'Present',
    logros: '',
    logros_optimizados: [
      'Led the migration from a monolithic platform to microservices, reducing deployment time by 60%.',
      'Designed and implemented a REST API that processes 50K+ daily requests with 99.9% uptime.',
      'Mentored a team of 4 junior developers while establishing code review and CI/CD standards.'
    ],
    skills_sugeridas: ['Vue.js', 'Node.js', 'PostgreSQL', 'Docker', 'AWS']
  },
  {
    id: 'mock-2',
    type: 'work',
    cargo: 'Frontend Developer',
    empresa: 'Digital Agency Pro',
    inicio: 'Jan 2019',
    fin: 'Feb 2021',
    logros: '',
    logros_optimizados: [
      'Built interactive dashboards with Vue.js and D3.js that improved client decision-making.',
      'Optimized the main site performance, achieving Lighthouse scores above 95 in all major metrics.'
    ],
    skills_sugeridas: ['Vue.js', 'TypeScript', 'Tailwind CSS', 'D3.js']
  }
]

const mockEducations = [
  { id: 'mock-edu-1', titulo: 'Systems Engineering', institucion: 'National University', inicio: '2014', fin: '2019', descripcion: '' },
  { id: 'mock-edu-2', titulo: 'Cloud Computing Diploma', institucion: 'Platzi Academy', inicio: '2020', fin: '2020', descripcion: '' }
]

const previewProfile = computed(() => ({
  nombre: profile.value.nombre || 'Alejandra Martinez',
  titulo: profile.value.titulo || 'Senior Full Stack Developer',
  ubicacion: profile.value.ubicacion || 'Bogota, Colombia',
  email_profile: profile.value.email_profile || 'alejandra.mtz@email.com',
  telefono: profile.value.telefono || '+57 310 456 7890',
  linkedin: profile.value.linkedin || 'linkedin.com/in/alejandra-mtz',
  otros: profile.value.otros || '',
  web: profile.value.web || 'alejandramtz.dev',
  educacion: profile.value.educacion || '',
  resumen: profile.value.resumen || 'Full Stack developer with 5+ years of experience building scalable web applications with a strong focus on product, performance, and clean engineering practices.',
  years: profile.value.years || '5'
}))

const previewEducations = computed(() => {
  if (educations.value.length) return educations.value.slice(0, 2)
  return mockEducations
})

const previewExperiences = computed(() => {
  if (experiences.value.length) return experiences.value.slice(0, 2)
  return mockExperiences
})

const previewAiData = computed(() => ({
  optimized_title: previewProfile.value.titulo,
  summary: previewProfile.value.resumen,
  top_skills: ['JavaScript', 'TypeScript', 'Vue.js', 'Node.js', 'PostgreSQL', 'Docker'],
  experiences: previewExperiences.value
}))

onMounted(async () => {
  await ensureProfileLoaded()
  const savedTemplate = localStorage.getItem('preferred-cv-template')
  if (savedTemplate && ['classic', 'minimalist', 'doublecolumn'].includes(savedTemplate)) {
    selectedTemplate.value = savedTemplate as 'classic' | 'minimalist' | 'doublecolumn'
  }
})
</script>

<style scoped>
.templates-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.templates-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.templates-copy {
  min-width: 0;
  flex: 1;
}

.templates-back-link {
  flex-shrink: 0;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1100px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.template-option {
  border: 2px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  background: var(--bg);
}

.template-option:hover {
  border-color: rgba(var(--amber-rgb), 0.4);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(var(--amber-rgb), 0.1);
}

.template-active {
  border-color: var(--amber);
  box-shadow: 0 0 0 1px var(--amber), 0 8px 24px rgba(var(--amber-rgb), 0.15);
}

.template-preview-wrapper {
  position: relative;
  width: 100%;
  height: 260px;
  overflow: hidden;
  background: #fff;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.template-preview-scaler {
  --preview-scale: 0.23;
  width: 210mm;
  min-height: 297mm;
  transform: scale(var(--preview-scale));
  transform-origin: top center;
  pointer-events: none;
  flex: 0 0 auto;
}

.template-preview-scaler :deep(.pdf-container),
.template-preview-scaler :deep(.cv-wrapper),
.template-preview-scaler :deep(#cv-template) {
  margin: 0 !important;
  width: 210mm !important;
  min-height: 297mm !important;
  max-width: 210mm !important;
  box-sizing: border-box;
}

.template-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.template-preview-wrapper:hover .template-overlay {
  opacity: 1;
}

.template-info {
  padding: 12px 14px;
}

.template-name {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.template-desc {
  font-size: 11px;
  color: var(--text3);
  line-height: 1.4;
  margin: 0 0 8px 0;
}

.template-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--amber);
  background: rgba(var(--amber-rgb), 0.1);
  padding: 3px 10px;
  border-radius: 20px;
}

.template-badge-ghost {
  color: var(--text3);
  background: transparent;
  border: 1px solid var(--border);
}

@media (max-width: 767px) {
  .templates-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .templates-back-link,
  .templates-back-link :deep(button) {
    width: 100%;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .template-preview-wrapper {
    height: 220px;
  }

  .template-preview-scaler {
    --preview-scale: 0.18;
  }
}

@media (min-width: 768px) and (max-width: 1100px) {
  .template-preview-scaler {
    --preview-scale: 0.28;
  }
}
</style>
