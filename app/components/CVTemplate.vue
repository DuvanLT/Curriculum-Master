<template>
  <!-- Este componente se renderiza oculto solo para generar el PDF -->
  <div id="cv-template" class="pdf-container bg-white font-serif leading-relaxed" style="width: 210mm; min-height: 297mm; margin: 0 auto; color: #1e293b; padding: 40px; background-color: #ffffff;">
    
    <!-- HEADER -->
    <header style="border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
      <h1 style="font-size: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; margin: 0;">{{ profile.nombre }}</h1>
      <p style="font-size: 18px; color: #475569; font-weight: 500; margin-top: 4px;">{{ aiData.optimized_title || profile.titulo }}</p>
      <div style="display: flex; justify-content: center; gap: 16px; font-size: 14px; color: #64748b; margin-top: 12px; font-family: sans-serif;">
        <span v-if="profile.email_profile">✉ {{ profile.email_profile }}</span>
        <span v-if="profile.telefono">📞 {{ profile.telefono }}</span>
        <span v-if="profile.web">🌐 {{ profile.web }}</span>
        <span v-if="profile.linkedin">in/{{ profile.linkedin.split('/').pop() }}</span>
      </div>
    </header>

    <!-- SUMMARY -->
    <section style="margin-bottom: 32px;">
      <h2 style="font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; padding-bottom: 4px; font-family: sans-serif;">Perfil Profesional</h2>
      <p style="font-size: 14px; color: #334155; text-align: justify; margin: 0;">
        {{ aiData.summary || profile.resumen }}
      </p>
    </section>

    <!-- EXPERIENCE -->
    <section style="margin-bottom: 32px;">
      <h2 style="font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; padding-bottom: 4px; font-family: sans-serif;">Experiencia Laboral</h2>
      
      <div v-for="exp in optimizedExperiences" :key="exp.id" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <h3 style="font-weight: bold; color: #0f172a; margin: 0; font-size: 14px;">{{ exp.cargo }}</h3>
          <span style="font-size: 12px; color: #64748b; font-family: sans-serif; font-style: italic;">{{ exp.inicio }} — {{ exp.fin || 'Presente' }}</span>
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #334155; font-style: italic; margin-bottom: 8px;">{{ exp.empresa }}</div>
        <ul style="list-style-type: disc; margin-left: 20px; font-size: 14px; color: #334155; margin-top: 0; padding-left: 0;">
          <li v-for="(logro, i) in exp.logros_optimizados" :key="i" style="margin-bottom: 4px;">
            {{ logro }}
          </li>
        </ul>
      </div>
    </section>

    <!-- EDUCATION -->
    <section style="margin-bottom: 32px;" v-if="profile.educacion">
      <h2 style="font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; padding-bottom: 4px; font-family: sans-serif;">Educación</h2>
      <p style="font-size: 14px; color: #334155; margin: 0;">{{ profile.educacion }}</p>
    </section>

    <!-- SKILLS -->
    <section>
      <h2 style="font-size: 13px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; padding-bottom: 4px; font-family: sans-serif;">Skills & Tecnologías</h2>
      <div style="display: flex; flex-wrap: wrap; column-gap: 24px; row-gap: 4px; margin-top: 8px;">
        <div v-for="skill in aiData.top_skills || profile.skills" :key="skill" style="font-size: 12px; color: #334155; font-family: sans-serif;">
          • {{ skill }}
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
const props = defineProps({
  profile: Object,
  experiences: Array,
  aiData: Object
})

const optimizedExperiences = computed(() => {
  return props.experiences.map(exp => {
    const aiExp = props.aiData.experiences?.find(ae => ae.id === exp.id)
    return {
      ...exp,
      cargo: aiExp?.cargo || exp.cargo,
      logros_optimizados: aiExp?.logros_optimizados || [exp.logros]
    }
  })
})
</script>

<style scoped>
/* Estilos específicos para asegurar la calidad del PDF */
.pdf-container {
  box-sizing: border-box;
}

@media print {
  .pdf-container {
    padding: 0;
    margin: 0;
  }
}
</style>
