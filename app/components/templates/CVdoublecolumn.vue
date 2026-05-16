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
          <h2 class="sb-title">{{ $t('profile.cv_section_contact') }}</h2>
          <div class="sb-item">
            <h3 class="sb-label">{{ $t('profile.cv_label_phone') }}</h3>
            <p class="sb-text">{{ profile.telefono }}</p>
          </div>
          <div class="sb-item">
            <h3 class="sb-label">{{ $t('profile.cv_label_email') }}</h3>
            <p class="sb-text">{{ profile.email_profile }}</p>
          </div>
          <div class="sb-item">
            <h3 class="sb-label">{{ $t('profile.cv_label_address') }}</h3>
            <p class="sb-text">{{ profile.ubicacion }}</p>
          </div>
        </section>

        <!-- EDUCACIÓN -->
        <section class="sb-section" v-if="normalizedEducations.length">
          <h2 class="sb-title">{{ $t('profile.cv_section_education') }}</h2>
          <div v-for="edu in normalizedEducations" :key="edu.id" class="sb-item">
            <h3 class="sb-label">{{ edu.inicio }} - {{ edu.fin || $t('profile.cv_current') }}</h3>
            <p class="sb-text"><strong>{{ edu.titulo }}</strong></p>
            <p class="sb-subtext">{{ edu.institucion }}</p>
          </div>
        </section>

        <!-- EXPERTISE / SKILLS -->
        <section class="sb-section" v-if="highlightedSkills.length">
          <h2 class="sb-title">{{ $t('profile.cv_section_expertise') }}</h2>
          <ul class="sb-list">
            <li v-for="skill in highlightedSkills" :key="skill">{{ skill }}</li>
          </ul>
        </section>

        <!-- IDIOMAS -->
        <section class="sb-section" v-if="languageSummary">
          <h2 class="sb-title">{{ $t('profile.cv_section_languages') }}</h2>
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
        <h2 class="main-title">{{ $t('profile.cv_section_experience_projects') }}</h2>
        <div class="timeline">
          <div v-for="exp in featuredEntries" :key="exp.id" class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <div class="exp-meta">
                <span class="exp-date">{{ exp.inicio }} - {{ exp.fin || $t('profile.cv_present') }}</span>
                <p class="exp-company">{{ exp.empresa }}</p>
              </div>
              <div class="exp-heading">
                <h3 class="exp-role">{{ exp.cargo }}</h3>
                <span v-if="exp.type === 'project'" class="exp-tag">{{ $t('profile.cv_tag_project') }}</span>
              </div>
              <ul class="exp-achievements">
                <li v-for="(logro, i) in exp.logros_optimizados" :key="i">{{ logro }}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const { t } = useI18n()

const props = defineProps({
  profile: Object,
  educations: Array,
  experiences: Array,
  aiData: Object,
  cvImage: String
});

const normalizedDate = (date) => {
  if (!date) return '';
  const d = String(date).trim().toLowerCase();
  if (['present', 'presente', 'actual', 'actualidad', 'current', 'currently'].includes(d)) {
    return '';
  }
  return date;
};

const normalizedEntries = computed(() => {
  const experiences = Array.isArray(props.aiData?.experiences) && props.aiData.experiences.length
    ? props.aiData.experiences
    : (Array.isArray(props.experiences) ? props.experiences : []);

  return experiences.map((exp, index) => ({
    ...exp,
    id: exp.id || `entry-${index}`,
    type: exp.type === 'project' ? 'project' : 'work',
    fin: normalizedDate(exp.fin),
    logros_optimizados: Array.isArray(exp.logros_optimizados)
      ? exp.logros_optimizados
      : (exp.logros ? [exp.logros] : [])
  }));
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
    .slice(0, 15);
});

const languageSummary = computed(() => {
  const raw = String(props.profile?.idiomas || '').trim();
  if (raw) {
    return raw.replace(/\n+/g, ' · ');
  }

  return t('profile.cv_default_languages_compact');
});

const normalizedEducations = computed(() => {
  const edus = props.educations || [];
  return edus.map(edu => ({
    ...edu,
    fin: normalizedDate(edu.fin)
  }));
});
</script>

<style scoped>
/* Reset y Base */
.cv-wrapper {
  display: flex;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
  font-family: 'Inter', 'Helvetica', sans-serif;
  color: #333;
}

/* Sidebar Oscuro */
.sidebar {
  width: 35%;
  background-color: #323b4c; /* Azul oscuro del diseño */
  color: #fff;
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
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
  background: #e2e8f0;
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

@media print {
  .cv-wrapper { width: 100%; margin: 0; height: 297mm !important; max-height: 297mm !important; overflow: hidden !important; }
  .sidebar { -webkit-print-color-adjust: exact; }
}
</style>
