<template>
  <div id="cv-template" class="pdf-container" style="width: 100%; max-width: 210mm; margin: 0 auto; box-sizing: border-box; color: #000; padding: 6mm 8mm; background-color: #fff; font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.25;    min-height: 297mm;  ">
    
    <!-- HEADER CON FOTO: imagen izquierda, datos derecha -->
    <header v-if="cvImage" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <div style="width: 40mm; height: 40mm; margin-right: 4mm; flex-shrink: 0;">
        <img :src="cvImage" style="width: 100%; height: 100%; object-fit: contain;" alt="Foto de perfil">
      </div>
      <div style="flex-grow: 1; text-align: right;">
        <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.025em;">{{ profile.nombre }}</h1>
        <p style="font-size: 13px; font-weight: 600; margin: 2px 0; color: #334155;">{{ aiData.optimized_title || profile.titulo }}</p>
        <p style="font-size: 12px; margin: 1px 0; color: #334155;">{{ profile.ubicacion }}</p>
        <p style="font-size: 12px; margin: 1px 0;">
          <a v-if="profile.email_profile" :href="emailHref" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">{{ profile.email_profile }}</a>
        </p>
        <p style="font-size: 12px; margin: 1px 0; color: #334155;">{{ profile.telefono }}</p>
        <p v-if="socialLinks.length" style="font-size: 12px; margin: 2px 0;">
          <template v-for="(link, index) in socialLinks" :key="link.label">
            <span v-if="index > 0" style="color: #94a3b8;"> · </span>
            <a :href="link.href" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">{{ link.label }}</a>
          </template>
        </p>
        <p v-if="profile.web" style="font-size: 12px; margin: 1px 0;">
          <a :href="webHref" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline; font-weight: 500;">{{ profile.web }}</a>
        </p>
      </div>
    </header>

    <!-- HEADER SIN FOTO: nombre centrado grande + datos en línea horizontal -->
    <header v-else style="text-align: center; margin-bottom: 10px;">
      <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 2px 0; color: #000000; letter-spacing: -0.03em;">{{ profile.nombre }}</h1>
      <p style="font-size: 13px; font-weight: 600; margin: 0 0 6px 0; color: #334155;">{{ aiData.optimized_title || profile.titulo }}</p>
      <div style="display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 0; font-size: 11px; color: #475569;">
        <span v-if="profile.telefono">{{ profile.telefono }}</span>
        <span v-if="profile.telefono && profile.email_profile" style="margin: 0 5px; color: #94a3b8;">·</span>
        <a v-if="profile.email_profile" :href="emailHref" style="color: #1d4ed8; text-decoration: underline;">{{ profile.email_profile }}</a>
        <span v-if="profile.ubicacion" style="margin: 0 5px; color: #94a3b8;">·</span>
        <span v-if="profile.ubicacion">{{ profile.ubicacion }}</span>
        <template v-for="link in socialLinks" :key="link.label">
          <span style="margin: 0 5px; color: #94a3b8;">·</span>
          <a :href="link.href" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline;">{{ link.label }}</a>
        </template>
        <template v-if="profile.web">
          <span style="margin: 0 5px; color: #94a3b8;">·</span>
          <a :href="webHref" target="_blank" rel="noopener noreferrer" style="color: #1d4ed8; text-decoration: underline;">{{ profile.web }}</a>
        </template>
      </div>
    </header>

    <hr style="border: 0; border-top: 2px solid #0f172a; margin-bottom: 10px;">

    <section style="margin-bottom: 12px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; margin-bottom: 4px;">{{ ct('profile.cv_section_summary') }}</h2>
      <p style="font-size: 11.5px; color: #0f172a; text-align: justify; margin: 0; line-height: 1.35;">
        {{ aiData.summary || profile.resumen }}
      </p>
      <div style="font-size: 11px; margin-top: 6px; color: #0f172a; padding: 4px 6px 4px 0px; border-radius: 4px;">
        <span style="font-weight: bold; font-style: italic; color: #0f172a;">{{ ct('profile.cv_section_skills') }}:</span> {{ displaySkills.join(', ') }}
      </div>
    </section>

    <section v-if="workExperiences.length" style="margin-bottom: 14px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; padding-bottom: 1px;">{{ ct('profile.cv_section_experience') }}</h2>

      <div v-for="exp in workExperiences" :key="exp.id" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 12.5px; font-weight: bold; color: #000;">{{ exp.empresa }} - {{ exp.cargo }}</span>
          <span style="font-size: 11px; color: #475569; font-weight: 600;">{{ td(exp.inicio) }} - {{ td(exp.fin) || ct('profile.cv_present') }}</span>
        </div>

        <ul style="margin: 2px 0 2px 14px; padding: 0; color: #334155; font-size: 11px; line-height: 1.35;">
          <li v-for="(achievement, index) in exp.logros_optimizados" :key="index" style="margin-bottom: 1px;">
            {{ achievement }}
          </li>
        </ul>

        <div style="font-size: 10.5px; color: #475569; font-style: italic;">
          <span style="font-weight: bold; color: #334155;">{{ ct('profile.cv_label_tools') }}:</span> {{ exp.skills_sugeridas?.join(', ') }}
        </div>
        <a v-if="exp.link" :href="cleanLink(exp.link)" target="_blank" rel="noopener" style="display:inline-block;margin-top:3px;font-size:10px;color:#475569;text-decoration:none;">↗ {{ linkLabel(exp.link) }}</a>
      </div>
    </section>

    <section v-if="projectExperiences.length" style="margin-bottom: 14px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; padding-bottom: 1px;">{{ ct('profile.cv_section_projects') }}</h2>

      <div v-for="exp in projectExperiences" :key="exp.id" style="margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 12.5px; font-weight: bold; color: #000;">{{ exp.empresa }} - {{ exp.cargo }}</span>
          <span style="font-size: 11px; color: #475569; font-weight: 600;">{{ td(exp.inicio) }} - {{ td(exp.fin) || ct('profile.cv_present') }}</span>
        </div>

        <ul style="margin: 2px 0 2px 14px; padding: 0; color: #334155; font-size: 11px; line-height: 1.35;">
          <li v-for="(achievement, index) in exp.logros_optimizados" :key="index" style="margin-bottom: 1px;">
            {{ achievement }}
          </li>
        </ul>

        <div style="font-size: 10.5px; color: #475569; font-style: italic;">
          <span style="font-weight: bold; color: #334155;">{{ ct('profile.cv_section_skills') }}:</span> {{ exp.skills_sugeridas?.join(', ') }}
        </div>
        <a v-if="exp.link" :href="cleanLink(exp.link)" target="_blank" rel="noopener" style="display:inline-block;margin-top:3px;font-size:10px;color:#475569;text-decoration:none;">↗ {{ linkLabel(exp.link) }}</a>
      </div>
    </section>

    <section v-if="normalizedEducations.length" style="margin-bottom: 12px;">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; padding-bottom: 1px;">{{ ct('profile.cv_section_education') }}</h2>
      <div v-for="edu in normalizedEducations" :key="edu.id" style="margin-bottom: 4px;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #0f172a;">{{ edu.titulo }} - {{ edu.institucion }}</p>
        <p style="margin: 0; font-size: 10.5px; color: #64748b;">{{ td(edu.inicio) }} - {{ td(edu.fin) || ct('profile.cv_current') }}</p>
      </div>
    </section>

    <section v-if="idiomasText">
      <h2 style="font-size: 15px; font-weight: bold; color: #000; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; padding-bottom: 1px;">{{ ct('profile.cv_section_languages') }}</h2>
      <p style="font-size: 11px; color: #334155; margin: 0;">{{ idiomasText }}</p>
    </section>

  </div>
</template>

<script setup>
import { translateDate, translateIdiomas } from '~/utils/cvLocalize'

const { locale } = useI18n()
const { $i18n } = useNuxtApp()

const cvLocale = computed(() => props.aiData?.cv_locale || locale.value)

// Use the global i18n instance — accepts locale as second argument (vue-i18n v9)
const ct = (key) => $i18n.t(key, cvLocale.value)
const td = (date) => translateDate(date, cvLocale.value)

const PRESENT_TOKENS = new Set([
  'present', 'presente', 'actual', 'actualidad', 'current', 'currently', 'now', 'hoy', 'hoje', 'today', ''
])

function isCurrentExp(fin) {
  if (fin === null || fin === undefined) return true
  return PRESENT_TOKENS.has(String(fin).trim().toLowerCase())
}

function parseExpDate(dateStr) {
  if (!dateStr) return Date.now()
  const str = String(dateStr).trim()
  const direct = new Date(str)
  if (!isNaN(direct.getTime())) return direct.getTime()
  const year = str.match(/\b(19|20)\d{2}\b/)
  if (year) return new Date(`${year[0]}-01-01`).getTime()
  return 0
}

function sortByRecency(exps) {
  return [...exps].sort((a, b) => {
    const aCur = isCurrentExp(a.fin)
    const bCur = isCurrentExp(b.fin)
    if (aCur && !bCur) return -1
    if (!aCur && bCur) return 1
    if (aCur && bCur) return parseExpDate(b.inicio) - parseExpDate(a.inicio)
    return parseExpDate(b.fin) - parseExpDate(a.fin)
  })
}

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

const displaySkills = computed(() => {
  const raw = props.aiData?.top_skills || []
  return (Array.isArray(raw) ? raw : [])
    .map(s => typeof s === 'string' ? s : s?.name)
    .filter(Boolean)
    .slice(0, 15)
})

function cleanLink(raw) {
  if (!raw) return null
  const url = raw.replace(/\s+/g, '')
  return url.startsWith('http') ? url : `https://${url}`
}

function linkLabel(raw) {
  try {
    return new URL(cleanLink(raw)).hostname.replace(/^www\./, '')
  } catch {
    return cleanLink(raw)
  }
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

  let merged
  if (!aiExperiences.length) {
    merged = sourceExperiences.map(exp => ({
      ...exp,
      type: normalizeExperienceType(exp.type),
      fin: normalizedDate(exp.fin),
      logros_optimizados: exp.logros ? [exp.logros] : []
    }))
  } else {
    merged = aiExperiences.map((aiExp) => {
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
  }

  return sortByRecency(merged)
})

const workExperiences = computed(() => {
  return optimizedExperiences.value.filter(exp => normalizeExperienceType(exp.type) !== 'project')
})

const projectExperiences = computed(() => {
  return optimizedExperiences.value.filter(exp => normalizeExperienceType(exp.type) === 'project')
})

const idiomasText = computed(() => {
  const raw = props.profile?.idiomas
  let text = ''
  if (Array.isArray(raw)) text = raw.filter(Boolean).join(', ')
  else if (typeof raw === 'string') text = raw.trim()
  return translateIdiomas(text, cvLocale.value)
})

const normalizedEducations = computed(() => {
  if (Array.isArray(props.educations) && props.educations.length) {
    const translated = Array.isArray(props.aiData?.translated_educations) ? props.aiData.translated_educations : []
    const map = new Map(translated.map(e => [e.id, e.titulo]))
    return props.educations.map(edu => ({
      ...edu,
      fin: normalizedDate(edu.fin),
      titulo: map.get(edu.id) || edu.titulo
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
