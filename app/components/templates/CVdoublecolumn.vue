<template>
  <div id="cv-template" class="cv-wrapper">
    <!-- COLUMNA IZQUIERDA (SIDEBAR) -->
    <aside class="sidebar">
      <div class="profile-section">
        <div v-if="cvImage" class="avatar-container">
          <img :src="cvImage" class="avatar" alt="Foto de perfil">
        </div>
      </div>

      <div class="sidebar-content">
        <!-- CONTACTO -->
        <section class="sb-section">
          <h2 class="sb-title">{{ ct('profile.cv_section_contact') }}</h2>
          <div class="sb-item">
            <h3 class="sb-label">{{ ct('profile.cv_label_phone') }}</h3>
            <p class="sb-text">{{ profile.telefono }}</p>
          </div>
          <div class="sb-item">
            <h3 class="sb-label">{{ ct('profile.cv_label_email') }}</h3>
            <p class="sb-text">{{ profile.email_profile }}</p>
          </div>
          <div class="sb-item">
            <h3 class="sb-label">{{ ct('profile.cv_label_address') }}</h3>
            <p class="sb-text">{{ profile.ubicacion }}</p>
          </div>
        </section>

        <!-- EDUCACIÓN -->
        <section class="sb-section" v-if="normalizedEducations.length">
          <h2 class="sb-title">{{ ct('profile.cv_section_education') }}</h2>
          <div v-for="edu in normalizedEducations" :key="edu.id" class="sb-item">
            <h3 class="sb-label">{{ td(edu.inicio) }} - {{ td(edu.fin) || ct('profile.cv_current') }}</h3>
            <p class="sb-text"><strong>{{ edu.titulo }}</strong></p>
            <p class="sb-subtext">{{ edu.institucion }}</p>
          </div>
        </section>

        <!-- EXPERTISE / SKILLS -->
        <section class="sb-section" v-if="highlightedSkills.length">
          <h2 class="sb-title">{{ ct('profile.cv_section_expertise') }}</h2>
          <ul class="sb-list">
            <li v-for="skill in highlightedSkills" :key="skill">{{ skill }}</li>
          </ul>
        </section>

        <!-- IDIOMAS -->
        <section class="sb-section" v-if="languageSummary">
          <h2 class="sb-title">{{ ct('profile.cv_section_languages') }}</h2>
          <p class="sb-text sb-text-compact">{{ languageSummary }}</p>
        </section>
      </div>
    </aside>

    <!-- COLUMNA DERECHA (CONTENIDO PRINCIPAL) -->
    <main class="main-content">
      <header class="main-header">
        <h1 class="user-name">{{ profile.nombre }}</h1>
        <p class="user-role">{{ aiData.optimized_title || profile.titulo }}</p>
        <p class="user-summary">{{ aiData.summary || profile.resumen }}</p>
      </header>

      <!-- EXPERIENCIA CON LÍNEA DE TIEMPO -->
      <section class="experience-section">
        <h2 class="main-title">{{ ct('profile.cv_section_experience_projects') }}</h2>
        <div class="timeline">
          <div v-for="exp in featuredEntries" :key="exp.id" class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="exp-meta">
                <span class="exp-date">{{ td(exp.inicio) }} - {{ td(exp.fin) || ct('profile.cv_present') }}</span>
                <p class="exp-company">{{ exp.empresa }}</p>
              </div>
              <div class="exp-heading">
                <h3 class="exp-role">{{ exp.cargo }}</h3>
                <span v-if="exp.type === 'project'" class="exp-tag">{{ ct('profile.cv_tag_project') }}</span>
              </div>
              <ul class="exp-achievements">
                <li v-for="(logro, i) in exp.logros_optimizados" :key="i">{{ logro }}</li>
              </ul>
              <a v-if="exp.link" :href="cleanLink(exp.link)" target="_blank" rel="noopener" class="exp-link">↗ {{ linkLabel(exp.link) }}</a>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { translateDate, translateIdiomas } from '~/utils/cvLocalize'

const { locale } = useI18n()
const { $i18n } = useNuxtApp()

const props = defineProps({
  profile: Object,
  educations: Array,
  experiences: Array,
  aiData: Object,
  cvImage: String
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

const normalizedDate = (date) => {
  if (!date) return '';
  const d = String(date).trim().toLowerCase();
  if (['present', 'presente', 'actual', 'actualidad', 'current', 'currently'].includes(d)) {
    return '';
  }
  return date;
};

const PRESENT_TOKENS = new Set([
  'present', 'presente', 'actual', 'actualidad', 'current', 'currently', 'now', 'hoy', 'hoje', 'today', ''
]);

function isCurrentExp(fin) {
  if (fin === null || fin === undefined) return true;
  return PRESENT_TOKENS.has(String(fin).trim().toLowerCase());
}

function parseExpDate(dateStr) {
  if (!dateStr) return Date.now();
  const str = String(dateStr).trim();
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) return direct.getTime();
  const year = str.match(/\b(19|20)\d{2}\b/);
  if (year) return new Date(`${year[0]}-01-01`).getTime();
  return 0;
}

function sortByRecency(exps) {
  return [...exps].sort((a, b) => {
    const aCur = isCurrentExp(a.fin);
    const bCur = isCurrentExp(b.fin);
    if (aCur && !bCur) return -1;
    if (!aCur && bCur) return 1;
    if (aCur && bCur) return parseExpDate(b.inicio) - parseExpDate(a.inicio);
    return parseExpDate(b.fin) - parseExpDate(a.fin);
  });
}

const normalizedEntries = computed(() => {
  const sourceExperiences = Array.isArray(props.experiences) ? props.experiences : [];
  const aiExperiences = Array.isArray(props.aiData?.experiences) && props.aiData.experiences.length
    ? props.aiData.experiences
    : sourceExperiences;

  const mapped = aiExperiences.map((exp, index) => {
    const sourceExp = sourceExperiences.find(s => s.id === exp.id) || {};
    return {
      ...sourceExp,
      ...exp,
      id: exp.id || `entry-${index}`,
      type: exp.type === 'project' ? 'project' : 'work',
      fin: normalizedDate(exp.fin),
      logros_optimizados: Array.isArray(exp.logros_optimizados)
        ? exp.logros_optimizados
        : (exp.logros ? [exp.logros] : [])
    };
  });

  return sortByRecency(mapped);
});

const featuredEntries = computed(() => {
  const work = normalizedEntries.value.filter(exp => exp.type !== 'project');
  const projects = normalizedEntries.value.filter(exp => exp.type === 'project');

  return [...work.slice(0, 2), ...projects.slice(0, 2)];
});

const highlightedSkills = computed(() => {
  const skills = Array.isArray(props.aiData?.top_skills) ? props.aiData.top_skills : [];
  return skills
    .map((skill) => typeof skill === 'string' ? skill : skill?.name)
    .filter(Boolean)
    .slice(0, 20);
});

const languageSummary = computed(() => {
  const raw = String(props.profile?.idiomas || '').trim();
  if (raw) {
    const translated = translateIdiomas(raw, cvLocale.value);
    return translated.replace(/\n+/g, ' · ');
  }

  return ct('profile.cv_default_languages_compact');
});

const normalizedEducations = computed(() => {
  const base = Array.isArray(props.educations) ? props.educations : []
  const translated = Array.isArray(props.aiData?.translated_educations) ? props.aiData.translated_educations : []
  const map = new Map(translated.map(e => [e.id, e.titulo]))
  return base.map(edu => ({
    ...edu,
    fin: normalizedDate(edu.fin),
    titulo: map.get(edu.id) || edu.titulo
  }))
})
</script>

<style scoped>
/* Reset y Base */
.cv-wrapper {
  display: flex;
  width: 210mm;
  align-items: flex-start;
  margin: 0 auto;
  background: #fff;
  font-family: 'Inter', 'Helvetica', sans-serif;
  color: #333;
  position: relative;
}

/* Franja decorativa izquierda — se ancla top/bottom para no depender de height:100% */
.cv-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 35%;
  background-color: #323b4c;
  z-index: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Sidebar Oscuro */
.sidebar {
  width: 35%;
  background-color: transparent;
  color: #fff;
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}


.avatar-container {
  width: 128px;
  height: 128px;
  margin: 0 auto 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #4a5568;
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.sb-section {
  margin-bottom: 22px;
  border-top: 1px solid #ffffff44;
  padding-top: 14px;
}

.sb-title {
  font-size: 17px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.sb-item { margin-bottom: 10px; }
.sb-label { font-size: 12px; font-weight: 700; margin: 0; color: #cbd5e0; }
.sb-text { font-size: 12px; margin: 2px 0; line-height: 1.35; }
.sb-text-compact { line-height: 1.45; }
.sb-subtext { font-size: 12px; color: #a0aec0; }

.sb-list {
  padding-left: 14px;
  font-size: 12px;
  line-height: 1.35;
}
.sb-list li { margin-bottom: 6px; }

/* Contenido Principal */
.main-content {
  width: 65%;
  padding: 24px 32px;
  position: relative;
  z-index: 1;
}

.user-name {
  font-size: 26px;
  font-weight: 800;
  margin: 0;
  color: #323b4c;
  line-height: 1.1;
}

.user-role {
  font-size: 17.5px;
  color: #4a5568;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 6px 0 10px;
  line-height: 1.3;
}

.user-summary {
  font-size: 10.5px;
  line-height: 1.4;
  color: #718096;
  margin-bottom: 24px;
}

.main-title {
  font-size: 21px;
  font-weight: 700;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 6px;
  margin-bottom: 18px;
  color: #323b4c;
}

/* Timeline Style */
.timeline {
  position: relative;
  padding-left: 24px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 5px;
  bottom: 0;
  width: 2px;
  background: #cbd5e0;
}

.timeline-item {
  position: relative;
  margin-bottom: 20px;
}

.timeline-marker {
  position: absolute;
  left: -24px;
  top: 5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #323b4c;
}

.exp-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #4a5568;
  gap: 10px;
}

.exp-role {
  font-size: 15px;
  font-weight: 700;
  margin: 4px 0;
}

.exp-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.exp-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  color: #334155;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.exp-achievements {
  font-size: 11px;
  color: #718096;
  padding-left: 14px;
  line-height: 1.4;
  margin: 0;
}

.experience-section {
  break-inside: avoid;
}

.exp-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 9.5px;
  color: #4a5568;
  text-decoration: none;
  word-break: break-all;
}

.exp-link:hover { text-decoration: underline; }

@media print {
  .cv-wrapper {
    width: 100%;
    margin: 0;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* En print, fixed repite el fondo en cada página */
  .cv-wrapper::before {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 35%;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
