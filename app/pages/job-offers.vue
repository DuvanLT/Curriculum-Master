<template>
  <NuxtLayout>
    <div class="offers-page overflow-hidden max-w-full">
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('ofertas.title') }} <HelpButton /></div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('ofertas.subtitle') }}</div>

      <!-- Search Bar -->
      <div class="search-bar mb-6">
        <div class="search-field">
          <AppInput 
            :label="$t('ofertas.search_keyword_label')" 
            v-model="keywords" 
            :placeholder="$t('ofertas.search_keyword_placeholder')" 
            @keyup.enter="searchJobs"
          />
        </div>
        <div class="search-field">
          <AppInput 
            :label="$t('ofertas.search_location_label')" 
            v-model="location" 
            :placeholder="$t('ofertas.search_location_placeholder')" 
            @keyup.enter="searchJobs"
          />
        </div>
        <div class="search-action">
          <AppButton @click="searchJobs" :loading="loading" class="search-button h-[38px] mb-3 px-6">
            <span class="material-symbols-outlined text-[18px] mr-1">search</span>
            {{ $t('ofertas.search_button') }}
          </AppButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-16">
        <div class="spinner inline-block"></div>
        <div class="text-[12px] text-text-dim font-mono mt-3">{{ $t('ofertas.loading_jobs') }}</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!hasSearched" class="text-center py-16">
        <span class="material-symbols-outlined text-6xl text-text-dim/30 mb-4 block">work</span>
        <div class="text-[14px] text-text-muted mb-2">{{ $t('ofertas.empty_search_title') }}</div>
        <div class="text-[12px] text-text-dim font-mono">{{ $t('ofertas.empty_search_subtitle') }}</div>
      </div>

      <!-- No Results -->
      <div v-else-if="jobs.length === 0" class="text-center py-16">
        <span class="material-symbols-outlined text-5xl text-text-dim/30 mb-4 block">search_off</span>
        <div class="text-[14px] text-text-muted">{{ $t('ofertas.no_results_title') }}</div>
        <div class="text-[12px] text-text-dim font-mono mt-1">{{ $t('ofertas.no_results_subtitle') }}</div>
      </div>

      <!-- Results -->
      <div v-else>
        <div class="results-count text-[12px] text-text-dim font-mono mb-4">
          {{ $t('ofertas.jobs_found', { count: totalCount }) }}
        </div>
       
        <div class="results-note mt-3 flex mb-4 items-center gap-1.5 text-[10px] text-amber/60 font-mono italic">
          <span class="material-symbols-outlined text-[12px]">info</span>
          {{ $t('ofertas.info_recommendation') }}
        </div>
        <div class="grid gap-3">
          <div 
            v-for="(job, i) in jobs" 
            :key="i"
            class="job-card relative bg-[var(--bg)]-bg2 border border-border rounded-lg p-5 hover:border-amber/40 transition-all group"
          >
            <div class="job-card-header flex justify-between items-start mb-2">
              <div class="flex-1 min-w-0">
                <div class="job-title text-[15px] font-medium text-text group-hover:text-amber transition-colors truncate">{{ job.title }}</div>
                <div class="job-company text-[13px] text-amber font-mono mt-0.5">{{ job.company }}</div>
              </div>
            </div>

            <div class="job-meta flex items-center gap-4 text-[11px] text-text-dim font-mono mb-3">
              <span v-if="job.location" class="job-meta-item flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">location_on</span>
                {{ job.location }}
              </span>
              <span v-if="job.type" class="job-meta-item flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">schedule</span>
                {{ job.type }}
              </span>
              <span v-if="job.salary" class="job-meta-item flex items-center gap-1 text-green">
                <span class="material-symbols-outlined text-[14px]">payments</span>
                {{ job.salary }}
              </span>
              <span v-if="job.updated" class="job-meta-item flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">calendar_today</span>
                {{ formatDate(job.updated) }}
              </span>
            </div>

            <div 
              v-if="job.snippet" 
              class="job-snippet text-[12px] text-text-muted leading-relaxed line-clamp-3 markdown-content"
              v-html="renderMarkdown(job.snippet)"
            ></div>


            <!-- Hover Actions -->
           <div class="job-actions absolute top-3 right-3 flex flex-row gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
           <!--    <button 
                @click="goToAnalisis(job)" 
                class="action-btn cursor-pointer flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 transition-all whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[10px]">search</span>
                {{ $t('ofertas.btn_analyze') }}
              </button>
              <button 
                @click="goToGenerador(job)" 
                class="action-btn cursor-pointer flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-md bg-green/10 border border-green/30 text-green hover:bg-green/20 transition-all whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[10px]">description</span>
                {{ $t('ofertas.btn_create_cv') }}
              </button>
              -->
              <a 
                :href="job.link" 
                target="_blank" 
                rel="noopener noreferrer"
                class="action-btn flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-text-dim/10 border border-border text-text-muted hover:text-text hover:border-text-muted/50 transition-all no-underline whitespace-nowrap"
              >
                <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                {{ $t('ofertas.btn_view_offer') }}
              </a>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="jobs.length < totalCount" class="text-center mt-6 mb-4">
          <AppButton variant="secondary" @click="loadMore" :loading="loadingMore">
            {{ $t('ofertas.btn_load_more') }}
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

const toast = useToast()
const { t } = useI18n()

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
    toast.error(t('ofertas.toast_empty_search'))
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
    toast.error(t('ofertas.toast_search_error', { error: e.statusMessage || e.message }))
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
    toast.error(t('ofertas.toast_load_more_error'))
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
  return renderSafeMarkdown(text)
}

const buildJobJD = (job: JoobleJob) => {
  const parts = [`${t('ofertas.jd_label_title')}${job.title}`]
  if (job.company) parts.push(`${t('ofertas.jd_label_company')}${job.company}`)
  if (job.location) parts.push(`${t('ofertas.jd_label_location')}${job.location}`)
  if (job.type) parts.push(`${t('ofertas.jd_label_type')}${job.type}`)
  if (job.salary) parts.push(`${t('ofertas.jd_label_salary')}${job.salary}`)
  if (job.snippet) {
    // Strip HTML tags from snippet
    const cleanSnippet = job.snippet.replace(/<[^>]+>/g, '')
    parts.push(`${t('ofertas.jd_label_description')}${cleanSnippet}`)
  }
  return parts.join('\n')
}

const goToAnalisis = (job: JoobleJob) => {
  navigateTo({ path: '/analysis', query: { jd: buildJobJD(job) } })
}

const goToGenerador = (job: JoobleJob) => {
  navigateTo({ path: '/generator-cv', query: { jd: buildJobJD(job) } })
}
</script>

<style scoped>
.offers-page {
  padding-bottom: 8px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: stretch;
  width: 100%;
}

.search-field {
  flex: 1;
  min-width: 0;
}

.search-action {
  flex: 0 0 15%;
  max-width: 140px;
  display: flex;
  align-items: flex-end;
}

.search-action :deep(button),
.search-button {
  width: 100%;
}

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

@media (max-width: 767px) {
  .offers-page .page-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    line-height: 1.15;
  }

  .offers-page .page-sub {
    font-size: 12px;
    line-height: 1.55;
    margin-bottom: 18px;
  }

  .search-bar {
    flex-direction: column;
    gap: 2px;
    margin-bottom: 20px;
    align-items: stretch;
  }

  .search-field {
    width: 100%;
    display: block;
    align-self: stretch;
  }

  .search-field :deep(label) {
    font-size: 13px;
    margin-bottom: 6px;
    letter-spacing: 0.08em;
  }

  .search-field :deep(.form-group) {
    gap: 8px;
    margin-bottom: 0;
  }

  .search-field :deep(input) {
    height: 56px !important;
    min-height: 56px !important;
    padding: 16px 14px !important;
    font-size: 15px !important;
    line-height: 1.2 !important;
    border-radius: 8px !important;
  }

  .search-action {
    flex: none;
    width: 100%;
    max-width: none;
    align-self: stretch;
  }

  .search-button {
    width: 100%;
    min-height: 46px;
    justify-content: center;
    margin-bottom: 0;
    align-items: center;
    margin-top: 10px;
  }

  .results-count {
    margin-bottom: 10px;
    line-height: 1.4;
  }

  .results-note {
    align-items: flex-start;
    margin-top: 0;
    line-height: 1.45;
  }

  .job-card {
    padding: 16px;
    border-radius: 14px;
  }

  .job-card-header {
    margin-bottom: 10px;
    padding-right: 0;
  }

  .job-title {
    font-size: 14px;
    line-height: 1.35;
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
  }

  .job-company {
    font-size: 12px;
  }

  .job-meta {
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .job-meta-item {
    width: 100%;
    min-width: 0;
    line-height: 1.4;
  }

  .job-snippet {
    font-size: 12px;
    line-height: 1.6;
    -webkit-line-clamp: 4;
    line-clamp: 4;
  }

  .job-actions {
    position: static;
    opacity: 1;
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
    min-height: 40px;
    padding: 10px 12px;
    white-space: normal;
    text-align: center;
  }
}
</style>
