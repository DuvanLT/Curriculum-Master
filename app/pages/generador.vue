<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Generador de CV con IA</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Potencia tu curriculum adaptando tu experiencia laboral a la oferta de empleo que te interesa, utilizando inteligencia artificial.</div>

      <AppCard title="Adaptar a una vacante">
        <div class="text-[12px] text-text-muted mb-3">
          Copia y pega la descripcion de la oferta para que la IA optimice tus logros y palabras clave.
        </div>
        <div class="text-[11px] text-text-dim mb-3 leading-relaxed">
          La adaptacion prioriza las experiencias mas relevantes para la vacante y evita inventar porcentajes o resultados no sustentados por tu perfil maestro.
        </div>
        <AppInput
          type="textarea"
          v-model="jd"
          :rows="4"
          placeholder="Ej: Buscamos un Disenador con experiencia en Adobe Photoshop, Illustrator y Figma..."
        />
        <div class="flex items-center gap-2 mt-4">
          <AppButton @click="generateAI" :disabled="loading" class="flex-1 sm:flex-none">
            <span v-if="loading" class="spinner mr-2"></span>
            <span v-else class="material-symbols-outlined text-[18px] mr-2">smart_toy</span>
            {{ loading ? 'Optimizando CV...' : 'Generar PDF con IA' }}
          </AppButton>
        </div>
      </AppCard>

      <div v-if="aiResult" class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="md:col-span-2">
          <AppCard title="Vista Previa de Optimizacion">
            <div class="p-3 bg-dark-bg2 rounded border border-border">
              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                RESUMEN OPTIMIZADO
              </div>
              <p class="text-[13px] text-text-muted leading-relaxed italic mb-4">
                "{{ aiResult.summary }}"
              </p>

              <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                TOP SKILLS PARA ESTA POSICION
              </div>
              <div class="flex flex-wrap gap-2 mb-2">
                <span v-for="skill in aiResult.top_skills" :key="skill" class="text-[11px] bg-dark-bg3 border border-border px-2 py-0.5 rounded text-text-dim">
                  {{ skill }}
                </span>
              </div>

              <div v-if="optimizedExperiences.length" class="mt-5">
                <div class="text-[12px] font-mono text-amber border-b border-border-dim pb-2 mb-3 tracking-widest uppercase">
                  EXPERIENCIAS PRIORIZADAS
                </div>
                <div v-for="exp in optimizedExperiences" :key="exp.id" class="mb-4 border border-border rounded p-3 bg-dark-bg3">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <div class="text-[13px] font-semibold text-text-main">
                      {{ exp.cargo }} - {{ exp.empresa }}
                    </div>
                  </div>
                  <ul class="space-y-2">
                    <li v-for="(achievement, index) in exp.logros_optimizados || []" :key="index" class="text-[12px] text-text-dim leading-relaxed flex gap-2">
                      <span class="text-amber">-</span>
                      <span>{{ achievement }}</span>
                    </li>
                  </ul>
                </div>
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
                <span class="text-amber">-</span> {{ advice }}
              </li>
            </ul>
            <AppButton variant="ghost" class="w-full mt-4 !text-[12px]" @click="exportToPDF">
              <span class="material-symbols-outlined text-[16px] mr-1">download</span>
              Descargar PDF Final
            </AppButton>
          </AppCard>
        </div>
      </div>

      <div style="position: absolute; left: -9999px; top: -9999px;">
        <CVTemplate
          v-if="aiResult"
          id="pdf-area"
          :profile="profile"
          :educations="educations"
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

const { profile, educations, experiences, ensureProfileLoaded, loading: profileLoading } = useAppState()
const toast = useToast()
const jd = ref('')
const loading = ref(false)
const aiResult = ref(null)

const optimizedExperiences = computed(() => {
  return Array.isArray(aiResult.value?.experiences) ? aiResult.value.experiences : []
})

onMounted(() => {
  const route = useRoute()
  if (route.query.jd) {
    jd.value = String(route.query.jd)
  }
})

const generateAI = async () => {
  await ensureProfileLoaded()

  if (profileLoading.value) {
    toast.error('Estamos cargando tu Perfil Maestro. Intenta de nuevo en un momento.')
    return
  }

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

  const element = document.getElementById('pdf-area')
  if (!element) {
    toast.error('No se pudo preparar el CV para impresion.')
    return
  }

  const printWindow = window.open('', '_blank', 'width=900,height=1200')
  if (!printWindow) {
    toast.error('El navegador bloqueo la ventana de impresion.')
    return
  }

  const safeName = (profile.value.nombre || 'CV').replace(/\s+/g, '_')

  printWindow.document.open()
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeName}_Optimizado</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 210mm;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          * {
            box-sizing: border-box;
          }

          #print-root {
            width: 210mm;
            margin: 0 auto;
            overflow: visible;
          }

          #print-root .pdf-container {
            width: 100% !important;
            max-width: 210mm !important;
            min-height: auto !important;
            padding: 12mm 10mm !important;
            margin: 0 auto !important;
          }

          #print-root .pdf-section,
          #print-root .pdf-entry {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          #print-root ul,
          #print-root li,
          #print-root p,
          #print-root div,
          #print-root section {
            overflow: visible !important;
          }

          @media print {
            html, body {
              width: auto;
              height: auto;
            }

            #print-root {
              width: auto;
            }
          }
        </style>
      </head>
      <body>
        <div id="print-root">${element.outerHTML}</div>
      </body>
    </html>
  `)
  printWindow.document.close()

  printWindow.focus()

  const handleAfterPrint = () => {
    printWindow.close()
  }

  printWindow.addEventListener('afterprint', handleAfterPrint, { once: true })

  setTimeout(() => {
    printWindow.print()
  }, 300)
}
</script>
