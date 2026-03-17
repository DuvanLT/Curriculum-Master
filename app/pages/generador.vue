<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Generador de CV con IA</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">// Optimización dinámica · PDF Profesional · Consejos Estratégicos</div>

      <AppCard title="Adaptar a una vacante">
        <div class="text-[12px] text-text-muted mb-3">
          Copia y pega la descripción de la oferta para que la IA optimice tus logros y palabras clave.
        </div>
        <AppInput 
          type="textarea" 
          v-model="jd" 
          :rows="4" 
          placeholder="Ej: Buscamos un desarrollador con experiencia en Nuxt, Tailwind y bases de datos NoSQL..." 
        />
        <div class="flex items-center gap-2 mt-4">
          <AppButton @click="generateAI" :disabled="loading" class="flex-1 sm:flex-none">
            <span v-if="loading" class="spinner mr-2"></span>
            <span v-else class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
            {{ loading ? 'Optimizando CV...' : 'Generar PDF con IA' }}
          </AppButton>
        </div>
      </AppCard>

      <!-- RESULTADO / CONSEJOS -->
      <div v-if="aiResult" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="md:col-span-2">
          <AppCard title="Vista Previa de Optimización">
            <div class="p-3 bg-dark-bg2 rounded border border-border">
              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                ▸ RESUMEN OPTIMIZADO
              </div>
              <p class="text-[13px] text-text-muted leading-relaxed italic mb-4">
                "{{ aiResult.summary }}"
              </p>
              
              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                ▸ TOP SKILLS PARA ESTA POSICIÓN
              </div>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="skill in aiResult.top_skills" :key="skill" class="text-[11px] bg-dark-bg3 border border-border px-2 py-0.5 rounded text-text-dim">
                  {{ skill }}
                </span>
              </div>
            </div>
          </AppCard>
        </div>

        <div>
          <AppCard title="Consejos Pro">
            <template #title-icon>
              <span class="material-symbols-outlined text-amber">lightbulb</span>
            </template>
            <ul class="space-y-3">
              <li v-for="(advice, i) in aiResult.advice" :key="i" class="text-[12px] text-text-dim leading-snug flex gap-2">
                <span class="text-amber">▸</span> {{ advice }}
              </li>
            </ul>
            <AppButton variant="ghost" class="w-full mt-4 !text-[12px]" @click="exportToPDF">
              <span class="material-symbols-outlined text-[16px] mr-1">download</span>
              Descargar PDF Final
            </AppButton>
          </AppCard>
        </div>
      </div>

      <!-- TEMPLATE OCULTO PARA PDF (Se renderiza siempre para que html2pdf lo encuentre, pero oculto con absolute off-screen) -->
      <div style="position: absolute; left: -9999px; top: -9999px;">
        <CVTemplate 
          v-if="aiResult"
          id="pdf-area"
          :profile="profile" 
          :experiences="experiences" 
          :aiData="aiResult"
        />
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const { profile, experiences } = useAppState()
const toast = useToast()
const jd = ref('')
const loading = ref(false)
const aiResult = ref(null)

const generateAI = async () => {
  if (!profile.value.nombre) {
    toast.error('Completa tu Perfil Maestro antes de generar el CV.')
    return
  }
  
  loading.value = true
  try {
    const data = await $fetch('/api/generate-cv', {
      method: 'POST',
      body: {
        profile: profile.value,
        experiences: experiences.value,
        jd: jd.value
      }
    })
    aiResult.value = data
  } catch (e) {
    console.error('Error generating CV:', e)
    toast.error('Error al conectar con la IA. Revisa tu API key.')
  } finally {
    loading.value = false
  }
}

const exportToPDF = async () => {
  if (!aiResult.value) return
  
  // Cargamos html2pdf solo en el cliente
  const html2pdf = (await import('html2pdf.js')).default
  
  const element = document.getElementById('pdf-area')
  const opt = {
    margin: 0,
    filename: `CV_${profile.value.nombre.replace(/\s/g, '_')}_Optimizado.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }

  html2pdf().from(element).set(opt).save()
}
</script>
