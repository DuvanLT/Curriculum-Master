<template>
  <NuxtLayout>
    <div class="overflow-hidden max-w-full">
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Ofertas de Empleo</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Powered by Jooble · Encuentra tu próximo reto profesional</div>

      <!-- Search Bar -->
      <div class="flex gap-3 mb-6">
        <AppInput 
          label="Cargo o palabras clave" 
          v-model="keywords" 
          placeholder="Desarrollador Backend, Python, Data..." 
          class="flex-1"
          @keyup.enter="searchJobs"
        />
        <AppInput 
          label="Ubicación" 
          v-model="location" 
          placeholder="Madrid, Remoto, Colombia..." 
          class="flex-1"
          @keyup.enter="searchJobs"
        />
        <div class="flex items-end">
          <AppButton @click="searchJobs" :loading="loading" class="h-[42px] px-6">
            <span class="material-symbols-outlined text-[18px] mr-1">search</span>
            Buscar
          </AppButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-16">
        <div class="spinner inline-block"></div>
        <div class="text-[12px] text-text-dim font-mono mt-3">Buscando ofertas...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!hasSearched" class="text-center py-16">
        <span class="material-symbols-outlined text-6xl text-text-dim/30 mb-4 block">work</span>
        <div class="text-[14px] text-text-muted mb-2">Busca ofertas de empleo en tiempo real</div>
        <div class="text-[12px] text-text-dim font-mono">Escribe un cargo o habilidad y una ubicación para empezar</div>
      </div>

      <!-- No Results -->
      <div v-else-if="jobs.length === 0" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-text-dim/30 mb-4 block">search_off</span>
        <div class="text-[14px] text-text-muted">No se encontraron ofertas con esos criterios</div>
        <div class="text-[12px] text-text-dim font-mono mt-1">Intenta con palabras clave o ubicación diferente</div>
      </div>

      <!-- Results -->
      <div v-else>
        <div class="text-[12px] text-text-dim font-mono mb-4">
          {{ totalCount }} ofertas encontradas
        </div>
       
            <div class="mt-3 flex mb-4 items-center gap-1.5 text-[10px] text-amber/60 font-mono italic">
              <span class="material-symbols-outlined text-[12px]">info</span>
              Recomendamos ir al enlace de la vacante para encontrar la información completa
            </div>
        <div class="grid gap-3">
          <div 
            v-for="(job, i) in jobs" 
            :key="i"
            class="job-card relative bg-dark-bg2 border border-border rounded-lg p-5 hover:border-amber/40 transition-all group"
          >
            <div class="flex justify-between items-start mb-2">
              <div class="flex-1 min-w-0">
                <div class="text-[15px] font-medium text-text group-hover:text-amber transition-colors truncate">{{ job.title }}</div>
                <div class="text-[13px] text-amber font-mono mt-0.5">{{ job.company }}</div>
              </div>
            </div>

            <div class="flex items-center gap-4 text-[11px] text-text-dim font-mono mb-3">
              <span v-if="job.location" class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">location_on</span>
                {{ job.location }}
              </span>
              <span v-if="job.type" class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">schedule</span>
                {{ job.type }}
              </span>
              <span v-if="job.salary" class="flex items-center gap-1 text-green">
                <span class="material-symbols-outlined text-[14px]">payments</span>
                {{ job.salary }}
              </span>
              <span v-if="job.updated" class="flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                {{ formatDate(job.updated) }}
              </span>
            </div>

            <div 
              v-if="job.snippet" 
              class="text-[12px] text-text-muted leading-relaxed line-clamp-3 markdown-content"
              v-html="renderMarkdown(job.snippet)"
            ></div>


            <!-- Hover Actions -->
            <div class="job-actions absolute top-3 right-3 flex flex-row gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                @click="goToAnalisis(job)" 
                class="action-btn cursor-pointer flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 transition-all whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[10px]">search</span>
                Analizar vacante
              </button>
              <button 
                @click="goToGenerador(job)" 
                class="action-btn cursor-pointer flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-green/10 border border-green/30 text-green hover:bg-green/20 transition-all whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[10px]">description</span>
                Crear CV
              </button>
              <a 
                :href="job.link" 
                target="_blank" 
                rel="noopener noreferrer"
                class="action-btn flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-text-dim/10 border border-border text-text-muted hover:text-text hover:border-text-muted/50 transition-all no-underline whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                Ver oferta
              </a>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="jobs.length < totalCount" class="text-center mt-6 mb-4">
          <AppButton variant="secondary" @click="loadMore" :loading="loadingMore">
            Cargar más ofertas
          </AppButton>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

import { marked } from 'marked'

const toast = useToast()

const STORAGE_KEY = 'ofertas_cache'

const keywords = ref('')
const location = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const hasSearched = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)

interface JoobleJob {
  title: string
  location: string
  snippet: string
  salary: string
  source: string
  type: string
  link: string
  company: string
  updated: string
  id: string
}

const jobs = ref<JoobleJob[]>([])

// Persist state to sessionStorage
function saveToSession() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      keywords: keywords.value,
      location: location.value,
      jobs: jobs.value,
      totalCount: totalCount.value,
      currentPage: currentPage.value,
      hasSearched: hasSearched.value
    }))
  } catch { /* quota exceeded, ignore */ }
}

function restoreFromSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    keywords.value = data.keywords || ''
    location.value = data.location || ''
    jobs.value = data.jobs || []
    totalCount.value = data.totalCount || 0
    currentPage.value = data.currentPage || 1
    hasSearched.value = data.hasSearched || false
    return hasSearched.value
  } catch { return false }
}

// Restore on mount
onMounted(() => {
  restoreFromSession()
})

const searchJobs = async () => {
  if (!keywords.value.trim() && !location.value.trim()) {
    toast.error('Escribe al menos una palabra clave o ubicación')
    return
  }

  loading.value = true
  hasSearched.value = true
  currentPage.value = 1
  jobs.value = []

  try {
    const data: any = await $fetch<any>('/api/jobs', {
      method: 'POST',
      body: {
        keywords: keywords.value,
        location: location.value,
        page: 1
      }
    })

    jobs.value = data.jobs || []
    totalCount.value = data.totalCount || 0
    saveToSession()
  } catch (e: any) {
    console.error(e)
    toast.error('Error al buscar ofertas: ' + (e.statusMessage || e.message))
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  loadingMore.value = true
  currentPage.value++

  try {
    const data: any = await $fetch<any>('/api/jobs', {
      method: 'POST',
      body: {
        keywords: keywords.value,
        location: location.value,
        page: currentPage.value
      }
    })

    const newJobs = data.jobs || []
    jobs.value.push(...newJobs)
    totalCount.value = data.totalCount || totalCount.value
    saveToSession()
  } catch (e: any) {
    console.error(e)
    toast.error('Error al cargar más ofertas')
    currentPage.value--
  } finally {
    loadingMore.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

const cleanHtml = (html: string) => {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '') 
}

const renderMarkdown = (text: string) => {
  if (!text) return ''
  return marked.parse(text)
}

const buildJobJD = (job: JoobleJob) => {
  const parts = [`Título: ${job.title}`]
  if (job.company) parts.push(`Empresa: ${job.company}`)
  if (job.location) parts.push(`Ubicación: ${job.location}`)
  if (job.type) parts.push(`Tipo: ${job.type}`)
  if (job.salary) parts.push(`Salario: ${job.salary}`)
  if (job.snippet) {
    // Strip HTML tags from snippet
    const cleanSnippet = job.snippet.replace(/<[^>]+>/g, '')
    parts.push(`\nDescripción:\n${cleanSnippet}`)
  }
  return parts.join('\n')
}

const goToAnalisis = (job: JoobleJob) => {
  navigateTo({ path: '/analisis', query: { jd: buildJobJD(job) } })
}

const goToGenerador = (job: JoobleJob) => {
  navigateTo({ path: '/generador', query: { jd: buildJobJD(job) } })
}
</script>

<style scoped>
.job-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}
.job-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.markdown-content) p {
  margin-bottom: 0.5rem;
}
:deep(.markdown-content) p:last-child {
  margin-bottom: 0;
}
:deep(.markdown-content) ul, :deep(.markdown-content) ol {
  margin-bottom: 0.5rem;
  padding-left: 1rem;
}
:deep(.markdown-content) li {
  margin-bottom: 0.15rem;
}
:deep(.markdown-content) strong {
  color: var(--amber);
  font-weight: 600;
}
</style>
