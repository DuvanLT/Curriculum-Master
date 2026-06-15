<template>
  <div id="cv-template" class="pdf-container">
    
    <!-- HEADER CON FOTO Y BANNER -->
    <header class="header-banner">
      <div v-if="cvImage" class="profile-photo">
        <img :src="cvImage" alt="Foto de perfil">
      </div>
      <div class="header-content">
        <h1 class="name">{{ profile.nombre }}</h1>
        <p class="title">{{ aiData.optimized_title || profile.titulo }}</p>
        <div class="contact-info">
          <span v-if="profile.email_profile">
            <i class="icon-mail"></i> {{ profile.email_profile }}
          </span>
          <span v-if="profile.telefono">
             | {{ profile.telefono }}
          </span>
        </div>
      </div>
    </header>

    <!-- RESUMEN / ACERCA DE MÍ -->
    <section class="section">
      <h2 class="section-title">{{ ct('profile.cv_section_about') }}</h2>
      <p class="summary-text">
        {{ aiData.summary || profile.resumen }}
      </p>
    </section>

    <!-- EXPERIENCIA LABORAL -->
    <section v-if="workExperiences.length" class="section">
      <h2 class="section-title">{{ ct('profile.cv_section_experience') }}</h2>
      
      <div v-for="exp in workExperiences" :key="exp.id" class="experience-item">
        <div class="exp-header">
          <span class="role">{{ exp.cargo }}</span>
          <span class="company-date">/ {{ exp.empresa }} - {{ td(exp.inicio) }} – {{ td(exp.fin) || ct('profile.cv_currently') }}</span>
        </div>
        
        <p class="exp-description" v-if="exp.descripcion">{{ exp.descripcion }}</p>
        
        <p class="achievements-paragraph" v-if="exp.logros_optimizados?.length">
          {{ exp.logros_optimizados.join(' ') }}
        </p>
        <a v-if="exp.link" :href="cleanLink(exp.link)" target="_blank" rel="noopener" class="exp-link">↗ {{ linkLabel(exp.link) }}</a>
      </div>
    </section>

    <!-- EDUCACIÓN (Diseño en Columnas) -->
    <section v-if="normalizedEducations.length" class="section">
      <h2 class="section-title">{{ ct('profile.cv_section_education') }}</h2>
      <div class="education-grid">
        <div v-for="edu in normalizedEducations" :key="edu.id" class="education-item">
          <h3 class="edu-inst">{{ edu.institucion }}</h3>
          <p class="edu-degree">{{ edu.titulo }}</p>
          <p class="edu-date">{{ td(edu.inicio) }} – {{ td(edu.fin) }}</p>
        </div>
      </div>
    </section>

    <!-- HABILIDADES TÉCNICAS -->
    <section class="section" v-if="aiData.top_skills">
      <h2 class="section-title">{{ ct('profile.cv_section_technical_skills') }}</h2>
      <div class="skills-list">
        <span v-for="(skill, index) in aiData.top_skills" :key="index" class="skill-entry">
          <strong>{{ skill.name || skill }}</strong>
        </span>
      </div>
    </section>

    <!-- IDIOMAS -->
    <section class="section">
      <h2 class="section-title">{{ ct('profile.cv_section_languages') }}</h2>
      <p class="summary-text">{{ translateIdiomas(profile.idiomas, cvLocale.value) || ct('profile.cv_default_languages') }}</p>
    </section>

  </div>
</template>

<script setup>
import { computed } from 'vue';
import { translateDate, translateIdiomas } from '~/utils/cvLocalize'

const { locale } = useI18n()
const { $i18n } = useNuxtApp()

const props = defineProps({
  profile: Object,
  educations: { type: Array, default: () => [] },
  experiences: { type: Array, default: () => [] },
  aiData: { type: Object, default: () => ({}) },
  cvImage: { type: String, default: null }
});

const cvLocale = computed(() => props.aiData?.cv_locale || locale.value)
const ct = (key) => $i18n.t(key, cvLocale.value)

const td = (date) => translateDate(date, cvLocale.value)

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

const optimizedExperiences = computed(() => {
  const sourceExperiences = Array.isArray(props.experiences) ? props.experiences : [];
  const aiExperiences = Array.isArray(props.aiData?.experiences) ? props.aiData.experiences : [];

  let merged;
  if (!aiExperiences.length) {
    merged = sourceExperiences.map(exp => ({
      ...exp,
      logros_optimizados: exp.logros ? [exp.logros] : []
    }));
  } else {
    merged = aiExperiences.map((aiExp) => {
      const sourceExp = sourceExperiences.find(exp => exp.id === aiExp.id) || {};
      return {
        ...sourceExp,
        ...aiExp,
        logros_optimizados: Array.isArray(aiExp.logros_optimizados) ? aiExp.logros_optimizados : (sourceExp.logros ? [sourceExp.logros] : [])
      };
    });
  }

  return sortByRecency(merged);
});

const workExperiences = computed(() => optimizedExperiences.value);

const normalizedEducations = computed(() => {
  const base = Array.isArray(props.educations) ? props.educations : []
  const translated = Array.isArray(props.aiData?.translated_educations) ? props.aiData.translated_educations : []
  const map = new Map(translated.map(e => [e.id, e.titulo]))
  return base.map(edu => ({ ...edu, titulo: map.get(edu.id) || edu.titulo }))
})
</script>

<style scoped>
/* Contenedor Principal Estilo A4 */
.pdf-container {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 15mm;
  background-color: #faf8f5; /* Color crema suave de fondo */
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  box-sizing: border-box;
}

/* Header Estilo Mariana */
.header-banner {
  display: flex;
  background-color: #dcd6c8; /* Color grisáceo/crema del banner */
  align-items: stretch;
  margin-bottom: 15px;
}

.profile-photo {
  width: 150px;
  height: 150px;
  overflow: hidden;
}

.profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 15px 30px;
  text-align: left;
}

.name {
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 1px;
  color: #1a1a1a;
}

.title {
  font-size: 14px;
  text-transform: uppercase;
  color: #555;
  margin: 6px 0;
  letter-spacing: 1px;
}

.contact-info {
  font-size: 12px;
  margin-top: 10px;
}

/* Secciones */
.section {
  margin-bottom: 16px;
  page-break-inside: avoid;
}

.section-title {
  background-color: #dcd6c8;
  padding: 5px 15px;
  font-size: 13px;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.summary-text {
  font-size: 11px;
  line-height: 1.6;
  text-align: justify;
  padding: 0 5px;
}

/* Experiencia */
.experience-item {
  margin-bottom: 15px;
  padding: 0 5px;
  page-break-inside: avoid;
}

.exp-header {
  margin-bottom: 5px;
}

.role {
  font-weight: 700;
  font-size: 13px;
  color: #222;
}

.company-date {
  font-size: 12px;
  color: #666;
}

.exp-description {
  font-size: 11px;
  margin: 5px 0;
  font-style: italic;
}

.achievements-paragraph {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: #555;
  text-align: justify;
}

.exp-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 10px;
  color: #555;
  text-decoration: none;
  word-break: break-all;
}

.exp-link:hover { text-decoration: underline; }

/* Educación en Fila */
.education-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 15px;
  padding: 0 5px;
}

.education-item {
  flex: 1;
  min-width: 0;
}

.edu-inst {
  font-size: 12px;
  font-weight: 700;
  margin: 0;
}

.edu-degree {
  font-size: 11px;
  margin: 2px 0;
}

.edu-date {
  font-size: 10px;
  color: #777;
}

/* Habilidades */
.skills-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px 15px;
  padding: 0 5px;
}

.skill-entry {
  font-size: 11px;
  line-height: 1.4;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  .pdf-container {
    margin: 0;
    width: 100% !important;
    max-width: none !important;
    padding: 6mm 10mm;
    background-color: #faf8f5 !important;
  }
  
  .header-banner {
    background-color: #dcd6c8 !important;
  }
  
  .section-title {
    background-color: #dcd6c8 !important;
  }
}
</style>
