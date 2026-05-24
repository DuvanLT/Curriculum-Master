<template>
  <div id="cv-template" class="pdf-container" style="width: 100%; max-width: 210mm; margin: 0 auto; box-sizing: border-box; color: #000; padding: 6mm 8mm; background-color: #fff; font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.25;    min-height: 297mm;  ">
    
    <header style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <div v-if="cvImage" style="width: 40mm; height: 40mm; margin-right: 4mm; flex-shrink: 0;">
        <img :src="cvImage" style="width: 100%; height: 100%; object-fit: contain;" alt="Foto de perfil">
      </div>
      <div style="flex-grow: 1; text-align: right;">
        <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.025em;">{{ profile.nombre }}</h1>
        <p style="font-size: 13px; margin: 2px 0; color: #334155;"><span style="font-weight: bold; color: #000;">{{ $t('profile.cv_label_location') }}:</span> {{ profile.ubicacion }}</p>
        <p style="font-size: 12px; margin: 1px 0;">
          <span style="font-weight: bold;">{{ $t('profile.cv_label_email') }}:</span>
          <a v-if="profile.email_profile" :href="emailHref" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">{{ profile.email_profile }}</a>
        </p>
        <p style="font-size: 12px; margin: 1px 0;"><span style="font-weight: bold;">{{ $t('profile.cv_label_phone') }}:</span> {{ profile.telefono }}</p>
        <p v-if="socialLinks.length" style="font-size: 14px; margin: 2px 0;">
          <span style="font-weight: bold;">{{ $t('profile.cv_label_social') }}:</span>
          <template v-for="(link, index) in socialLinks" :key="link.label">
            <span v-if="index > 0"> - </span>
            <a :href="link.href" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">
              {{ link.label }}
            </a>
          </template>
        </p>
        <p style="font-size: 14px; margin: 3px 0; color: #0f172a;"><span style="font-weight: 800;">{{ $t('profile.cv_label_role') }}:</span> {{ aiData.optimized_title || profile.titulo }}</p>
        <p v-if="profile.web" style="font-size: 12px; margin: 1px 0;">
          <span style="font-weight: bold;">{{ $t('profile.cv_label_portfolio') }}:</span>
          <a :href="webHref" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">
            {{ profile.web }}
          </a>
        </p>
      </div>
    </header>

    <hr style="border: 0; border-top: 2px solid #0f172a; margin-bottom: 10px;">

    <section style="margin-bottom: 12px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; margin-bottom: 4px;">{{ $t('profile.cv_section_summary') }}</h2>
      <p style="font-size: 11.5px; color: #0f172a; text-align: justify; margin: 0; line-height: 1.35;">
        {{ aiData.summary || profile.resumen }}
      </p>
      <div style="font-size: 11px; margin-top: 6px; color: #0f172a; padding: 4px 6px 4px 0px; border-radius: 4px;">
        <span style="font-weight: bold; font-style: italic; color: #0f172a;">{{ $t('profile.cv_section_skills') }}:</span> {{ (aiData.top_skills || []).join(', ') }}
      </div>
    </section>

    <section v-if="workExperiences.length" style="margin-bottom: 14px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; padding-bottom: 1px;">{{ $t('profile.cv_section_experience') }}</h2>

      <div v-for="exp in workExperiences" :key="exp.id" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 12.5px; font-weight: bold; color: #000;">{{ exp.empresa }} - {{ exp.cargo }}</span>
          <span style="font-size: 11px; color: #475569; font-weight: 600;">{{ exp.inicio }} - {{ exp.fin || $t('profile.cv_present') }}</span>
        </div>

        <ul style="margin: 2px 0 2px 14px; padding: 0; color: #334155; font-size: 11px; line-height: 1.35;">
          <li v-for="(achievement, index) in exp.logros_optimizados" :key="index" style="margin-bottom: 1px;">
            {{ achievement }}
          </li>
        </ul>

        <div style="font-size: 10.5px; color: #475569; font-style: italic;">
          <span style="font-weight: bold; color: #334155;">{{ $t('profile.cv_label_tools') }}:</span> {{ exp.skills_sugeridas?.join(', ') }}
        </div>
      </div>
    </section>

    <section v-if="projectExperiences.length" style="margin-bottom: 14px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; padding-bottom: 1px;">{{ $t('profile.cv_section_projects') }}</h2>

      <div v-for="exp in projectExperiences" :key="exp.id" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 12.5px; font-weight: bold; color: #000;">{{ exp.empresa }} - {{ exp.cargo }}</span>
          <span style="font-size: 11px; color: #475569; font-weight: 600;">{{ exp.inicio }} - {{ exp.fin || $t('profile.cv_present') }}</span>
        </div>

        <ul style="margin: 2px 0 2px 14px; padding: 0; color: #334155; font-size: 11px; line-height: 1.35;">
          <li v-for="(achievement, index) in exp.logros_optimizados" :key="index" style="margin-bottom: 1px;">
            {{ achievement }}
          </li>
        </ul>

        <div style="font-size: 10.5px; color: #475569; font-style: italic;">
          <span style="font-weight: bold; color: #334155;">{{ $t('profile.cv_section_skills') }}:</span> {{ exp.skills_sugeridas?.join(', ') }}
        </div>
      </div>
    </section>

    <section v-if="normalizedEducations.length">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; padding-bottom: 1px;">{{ $t('profile.cv_section_education') }}</h2>
      <div v-for="edu in normalizedEducations" :key="edu.id" style="margin-bottom: 4px;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">{{ edu.titulo }} - {{ edu.institucion }}</p>
        <p style="margin: 0; font-size: 10.5px; color: #64748b;">{{ edu.inicio }} - {{ edu.fin || $t('profile.cv_current') }}</p>
      </div>
    </section>

  </div>
</template>

<script setup>
const { t } = useI18n()

const props = defineProps({
  profile: Object,
  educations: {
    type: Array,
    default: () => []
  },
  experiences: {
    type: Array,
    default: () => []
  },
  aiData: {
    type: Object,
    default: () => ({})
  },
  cvImage: {
    type: String,
    default: null
  }
})

const normalizeHref = (value) => {
  if (!value || typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(mailto:|https?:\/\/|tel:)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

const emailHref = computed(() => {
  const email = String(props.profile?.email_profile || '').trim()
  return email ? `mailto:${email}` : ''
})

const webHref = computed(() => normalizeHref(props.profile?.web))

const socialLinks = computed(() => {
  const links = []

  if (props.profile?.linkedin) {
    links.push({ label: 'LinkedIn', href: normalizeHref(props.profile.linkedin) })
  }

  if (props.profile?.otros) {
    links.push({ label: t('profile.cv_label_other_links'), href: normalizeHref(props.profile.otros) })
  }

  return links
})

const normalizeExperienceType = (value) => {
  return value === 'project' ? 'project' : 'work'
}

const normalizedDate = (date) => {
  if (!date) return '';
  const d = String(date).trim().toLowerCase();
  if (['present', 'presente', 'actual', 'actualidad', 'current', 'currently'].includes(d)) {
    return '';
  }
  return date;
}

const optimizedExperiences = computed(() => {
  const sourceExperiences = Array.isArray(props.experiences) ? props.experiences : []
  const aiExperiences = Array.isArray(props.aiData?.experiences) ? props.aiData.experiences : []

  if (!aiExperiences.length) {
    return sourceExperiences.map(exp => ({
      ...exp,
      type: normalizeExperienceType(exp.type),
      fin: normalizedDate(exp.fin),
      logros_optimizados: exp.logros ? [exp.logros] : []
    }))
  }

  return aiExperiences.map((aiExp) => {
    const sourceExp = sourceExperiences.find(exp => exp.id === aiExp.id) || {}
    return {
      ...sourceExp,
      ...aiExp,
      type: normalizeExperienceType(aiExp.type || sourceExp.type),
      inicio: aiExp.inicio || sourceExp.inicio || '',
      fin: normalizedDate(aiExp.fin || sourceExp.fin || ''),
      logros_optimizados: Array.isArray(aiExp.logros_optimizados)
        ? aiExp.logros_optimizados
        : (sourceExp.logros ? [sourceExp.logros] : []),
      skills_sugeridas: Array.isArray(aiExp.skills_sugeridas) ? aiExp.skills_sugeridas : []
    }
  })
})

const workExperiences = computed(() => {
  return optimizedExperiences.value.filter(exp => normalizeExperienceType(exp.type) !== 'project')
})

const projectExperiences = computed(() => {
  return optimizedExperiences.value.filter(exp => normalizeExperienceType(exp.type) === 'project')
})

const normalizedEducations = computed(() => {
  if (Array.isArray(props.educations) && props.educations.length) {
    return props.educations.map(edu => ({
      ...edu,
      fin: normalizedDate(edu.fin)
    }))
  }

  if (typeof props.profile?.educacion === 'string' && props.profile.educacion.trim()) {
    return props.profile.educacion
      .split('\n')
      .map((line, index) => ({
        id: `legacy-${index}`,
        titulo: line,
        institucion: '',
        inicio: '',
        fin: '',
        descripcion: ''
      }))
      .filter(item => item.titulo.trim())
  }

  return []
})
</script>

<style scoped>
.pdf-container {
  box-sizing: border-box;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.pdf-section,
.pdf-entry {
  break-inside: avoid;
  page-break-inside: avoid;
}

@media print {
  .pdf-container {
    max-width: none;
    padding: 12mm 10mm;
    margin: 0;
  }
}
</style>
