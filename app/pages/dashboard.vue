<template>
  <NuxtLayout>
    <div class="dashboard-root">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">
            <span>{{ $t('dashboard.title') }}</span>
            <HelpButton />
          </div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('dashboard.subtitle') }}</div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="dash-loading">
        <div class="spinner"></div>
        <div class="text-[12px] text-text-dim font-mono mt-3 uppercase tracking-widest">{{ $t('dashboard.loading') }}</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!data" class="dash-empty">
        <span class="material-symbols-outlined text-6xl text-text-dim/20 mb-4">dashboard</span>
        <div class="text-[14px] text-text-muted mb-2">{{ $t('dashboard.empty_title') }}</div>
        <AppButton @click="fetchDashboard" variant="primary">{{ $t('dashboard.retry') }}</AppButton>
      </div>

      <!-- Dashboard Content -->
      <div v-else class="dash-grid">

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- ROW 1: ATS Score + Skills Heatmap + Quick Wins     -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div class="dash-row-1">

          <!-- ATS Score Gauge -->
          <div class="dash-card dash-card-score">
            <div class="dash-card-label">{{ $t('dashboard.ats_score_avg') }}</div>
            <div class="score-gauge-wrap">
              <svg class="score-gauge" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg4)" stroke-width="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  :stroke="scoreColor(data.atsScore.average)"
                  stroke-width="10"
                  :stroke-dasharray="`${2 * Math.PI * 50 * animatedScore / 100} ${2 * Math.PI * 50}`"
                  stroke-linecap="round"
                  transform="rotate(-90 60 60)"
                  class="score-arc"
                />
              </svg>
              <div class="score-gauge-inner">
                <div class="score-gauge-num" :style="{ color: scoreColor(data.atsScore.average) }">{{ animatedScore }}%</div>
                <div class="score-gauge-label">{{ $t('dashboard.match') }}</div>
              </div>
            </div>
            <div class="score-meta">
              <div class="score-meta-item">
                <span class="score-meta-num">{{ data.atsScore.totalAnalyses }}</span>
                <span class="score-meta-label">{{ $t('dashboard.analyses') }}</span>
              </div>
              <div class="score-meta-item">
                <span class="score-meta-num">{{ data.atsScore.userSkillCount }}</span>
                <span class="score-meta-label">{{ $t('dashboard.your_skills') }}</span>
              </div>
            </div>
            <!-- Mini sparkline -->
            <div v-if="data.atsScore.scoreHistory.length > 1" class="sparkline-wrap">
              <svg :viewBox="`0 0 ${data.atsScore.scoreHistory.length * 20} 40`" class="sparkline-svg" preserveAspectRatio="none">
                <polyline
                  :points="sparklinePoints"
                  fill="none"
                  :stroke="scoreColor(data.atsScore.average)"
                  stroke-width="2"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
              <div class="sparkline-label">{{ $t('dashboard.score_trend') }}</div>
            </div>
          </div>

          <!-- Skills Heatmap -->
          <div class="dash-card dash-card-skills">
            <div class="dash-card-label">{{ $t('dashboard.skills_title') }}</div>
            <div v-if="data.atsScore.demandedSkills.length === 0" class="skills-empty">
              <span class="material-symbols-outlined text-3xl text-text-dim/20 mb-2">bar_chart</span>
              <div class="text-[11px] text-text-dim font-mono">{{ $t('dashboard.skills_empty') }}</div>
              <AppButton variant="ghost" size="sm" class="mt-3" @click="navigateTo('/analysis')">
                <span class="material-symbols-outlined text-[14px] mr-1">search</span>
                {{ $t('dashboard.go_to_analysis') }}
              </AppButton>
            </div>
            <div v-else class="skills-bars">
              <div v-for="skill in data.atsScore.demandedSkills.slice(0, 10)" :key="skill.skill" class="skill-row">
                <div class="skill-name" :class="{ 'skill-has': skill.userHas }">
                  <span v-if="skill.userHas" class="material-symbols-outlined skill-check">check_circle</span>
                  <span v-else class="material-symbols-outlined skill-missing">radio_button_unchecked</span>
                  {{ skill.skill }}
                </div>
                <div class="skill-bar-track">
                  <div
                    class="skill-bar-fill"
                    :class="skill.userHas ? 'skill-bar-has' : 'skill-bar-miss'"
                    :style="{ width: `${Math.min(100, (skill.count / maxSkillCount) * 100)}%` }"
                  ></div>
                </div>
                <div class="skill-count">{{ skill.count }}×</div>
              </div>
            </div>
          </div>

          <!-- Quick Wins -->
          <div class="dash-card dash-card-wins">
            <div class="dash-card-label">
              <span class="material-symbols-outlined text-[16px] text-amber mr-1">bolt</span>
              {{ $t('dashboard.quick_wins') }}
            </div>
            <div v-if="data.atsScore.quickWins.length === 0" class="wins-empty">
              <div class="text-[11px] text-text-dim font-mono text-center leading-relaxed">
                {{ $t('dashboard.quick_wins_empty') }}
              </div>
            </div>
            <div v-else class="wins-list">
              <div v-for="(win, i) in data.atsScore.quickWins" :key="i" class="win-card">
                <div class="win-impact">+{{ win.impact }}%</div>
                <div class="win-body">
                  <div class="win-skill">{{ win.skill }}</div>
                  <div class="win-desc">{{ $t('dashboard.win_desc', { count: win.demandCount }) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- ROW 2: Pipeline / Embudo de Conversión              -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div class="dash-card dash-card-pipeline">
          <div class="dash-card-label">{{ $t('dashboard.pipeline_title') }}</div>
          <div class="pipeline-funnel">
            <div class="funnel-stage" v-for="(stage, i) in pipelineStages" :key="stage.key">
              <div class="funnel-bar-wrap" :style="{ '--funnel-pct': stage.pct + '%' }">
                <div class="funnel-bar" :style="{ width: stage.pct + '%', background: stage.color }"></div>
              </div>
              <div class="funnel-info">
                <div class="funnel-num" :style="{ color: stage.color }">{{ stage.value }}</div>
                <div class="funnel-label">{{ stage.label }}</div>
              </div>
              <div v-if="i < pipelineStages.length - 1" class="funnel-rate">
                <span class="material-symbols-outlined text-[12px]">arrow_downward</span>
                {{ pipelineRates[i] }}%
              </div>
            </div>
          </div>
          <!-- Insight -->
          <div class="pipeline-insight">
            <span class="material-symbols-outlined text-[18px]">lightbulb</span>
            <span>{{ $t(data.pipeline.insight) }}</span>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════ -->
        <!-- ROW 3: Market Fit + CV History                      -->
        <!-- ═══════════════════════════════════════════════════ -->
        <div class="dash-row-3">

          <!-- Market Fit -->
          <div class="dash-card dash-card-market">
            <div class="dash-card-label">{{ $t('dashboard.market_fit_title') }}</div>

            <!-- Top Companies -->
            <div class="market-section">
              <div class="market-sub-label">
                <span class="material-symbols-outlined text-[14px]">business</span>
                {{ $t('dashboard.top_companies') }}
              </div>
              <div v-if="data.marketFit.topCompanies.length === 0" class="market-empty">
                <span class="text-[11px] text-text-dim font-mono">{{ $t('dashboard.no_data_yet') }}</span>
              </div>
              <div v-else class="company-list">
                <div v-for="(c, i) in data.marketFit.topCompanies" :key="c.name" class="company-item">
                  <div class="company-rank">{{ i + 1 }}</div>
                  <div class="company-name">{{ c.name }}</div>
                  <div class="company-count">{{ $t('dashboard.analyses_count', { count: c.count }) }}</div>
                </div>
              </div>
            </div>

            <!-- Trending Keywords -->
            <div class="market-section mt-5">
              <div class="market-sub-label">
                <span class="material-symbols-outlined text-[14px]">trending_up</span>
                {{ $t('dashboard.trending_keywords') }}
              </div>
              <div v-if="data.marketFit.trendingKeywords.length === 0" class="market-empty">
                <span class="text-[11px] text-text-dim font-mono">{{ $t('dashboard.keywords_empty') }}</span>
              </div>
              <div v-else class="keyword-cloud">
                <span
                  v-for="kw in data.marketFit.trendingKeywords"
                  :key="kw.keyword"
                  class="keyword-tag"
                  :class="{ 'keyword-hot': kw.count >= 3 }"
                >
                  {{ kw.keyword }}
                  <span class="keyword-badge">{{ kw.count }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- CV History -->
          <div class="dash-card dash-card-history">
            <div class="dash-card-label">
              <span class="material-symbols-outlined text-[16px] mr-1">history</span>
              {{ $t('dashboard.cv_history_title') }}
            </div>
            <div v-if="data.cvHistory.length === 0" class="history-empty">
              <span class="material-symbols-outlined text-3xl text-text-dim/20 mb-2">description</span>
              <div class="text-[11px] text-text-dim font-mono text-center mb-3">{{ $t('dashboard.no_cvs') }}</div>
              <AppButton variant="ghost" size="sm" @click="navigateTo('/generator-cv')">
                <span class="material-symbols-outlined text-[14px] mr-1">description</span>
                {{ $t('dashboard.generate_first_cv') }}
              </AppButton>
            </div>
            <div v-else class="cv-timeline">
              <div v-for="cv in data.cvHistory" :key="cv.id" class="cv-timeline-item">
                <div class="cv-timeline-dot"></div>
                <div class="cv-timeline-line"></div>
                <div class="cv-timeline-content">
                  <div class="cv-timeline-position">{{ cv.position }}</div>
                  <div class="cv-timeline-company">
                    <span class="material-symbols-outlined text-[12px]">business</span>
                    {{ cv.company }}
                  </div>
                  <div class="cv-timeline-meta">
                    <span class="cv-timeline-date">{{ formatDate(cv.created_at) }}</span>
                    <span v-if="cv.hasJD" class="cv-timeline-badge">{{ $t('dashboard.with_jd') }}</span>
                    <span v-else class="cv-timeline-badge cv-badge-general">{{ $t('dashboard.general') }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="data.cvHistory.length > 0" class="history-footer">
              <AppButton variant="ghost" size="sm" class="w-full" @click="navigateTo('/generator-cv')">
                <span class="material-symbols-outlined text-[14px] mr-1">add</span>
                {{ $t('dashboard.generate_new_cv') }}
              </AppButton>
            </div>
          </div>
        </div>

      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
// Removed redundant middleware: auth (now global)

interface DashboardData {
  atsScore: {
    average: number
    totalAnalyses: number
    scoreHistory: { score: number; date: string }[]
    demandedSkills: { skill: string; count: number; userHas: boolean }[]
    userSkillCount: number
    quickWins: { skill: string; demandCount: number; impact: number }[]
  }
  pipeline: {
    analyses: number
    cvs: number
    applications: number
    interviews: number
    offers: number
    statusCounts: Record<string, number>
    rates: {
      analysesToCVs: number
      cvsToApps: number
      appsToInterviews: number
      interviewsToOffers: number
    }
    insight: string
  }
  marketFit: {
    topCompanies: { name: string; count: number }[]
    trendingKeywords: { keyword: string; count: number }[]
  }
  cvHistory: {
    id: string
    company: string
    position: string
    hasJD: boolean
    created_at: string
  }[]
}

const { t } = useI18n()
const loading = ref(true)
const data = ref<DashboardData | null>(null)
const animatedScore = ref(0)

const fetchDashboard = async () => {
  loading.value = true
  try {
    data.value = await $fetch<DashboardData>('/api/dashboard')
    // Animate score
    animatedScore.value = 0
    if (data.value?.atsScore.average) {
      const target = data.value.atsScore.average
      const duration = 1200
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        animatedScore.value = Math.round(target * eased)
        if (progress < 1) requestAnimationFrame(animate)
      }
      requestAnimationFrame(animate)
    }
  } catch (e) {
    console.error('Error loading dashboard:', e)
  } finally {
    loading.value = false
  }
}

const scoreColor = (score: number) => {
  if (score >= 70) return 'var(--green)'
  if (score >= 45) return 'var(--amber)'
  if (score > 0) return 'var(--red)'
  return 'var(--text3)'
}

const maxSkillCount = computed(() => {
  if (!data.value?.atsScore.demandedSkills.length) return 1
  return Math.max(...data.value.atsScore.demandedSkills.map(s => s.count))
})

const sparklinePoints = computed(() => {
  if (!data.value?.atsScore.scoreHistory.length) return ''
  const history = data.value.atsScore.scoreHistory
  const width = history.length * 20
  return history.map((p, i) => {
    const x = (i / (history.length - 1)) * (width - 4) + 2
    const y = 38 - (p.score / 100) * 36
    return `${x},${y}`
  }).join(' ')
})

const pipelineStages = computed(() => {
  if (!data.value) return []
  const p = data.value.pipeline
  // First stage is always 100%, every stage scales proportionally but can never exceed the previous one
  const stages = [
    { key: 'analyses', label: t('dashboard.stage_analyses'), value: p.analyses, color: 'var(--amber)' },
    { key: 'cvs', label: t('dashboard.stage_cvs'), value: p.cvs, color: '#6366f1' },
    { key: 'apps', label: t('dashboard.stage_applications'), value: p.applications, color: '#0ea5e9' },
    { key: 'interviews', label: t('dashboard.stage_interviews'), value: p.interviews, color: 'var(--green)' },
    { key: 'offers', label: t('dashboard.stage_offers'), value: p.offers, color: '#f59e0b' }
  ]
  const total = Math.max(p.analyses, p.cvs, p.applications, 1)
  let prevPct = 100
  return stages.map(s => {
    const rawPct = s.value > 0 ? Math.max(8, (s.value / total) * 100) : 8
    const pct = Math.min(rawPct, prevPct) // Never wider than the previous stage
    prevPct = s.value > 0 ? pct : prevPct * 0.5 // Zero values get half the previous width
    return { ...s, pct: s.value > 0 ? pct : 0 }
  })
})

const pipelineRates = computed(() => {
  if (!data.value) return []
  const r = data.value.pipeline.rates
  return [r.analysesToCVs, r.cvsToApps, r.appsToInterviews, r.interviewsToOffers]
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(fetchDashboard)
</script>

<style scoped>
/* ─── Layout ─── */
.dashboard-root {
  max-width: 1200px;
  margin: 0 auto;
}

.dash-header {
  margin-bottom: 24px;
}

.dash-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.dash-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.dash-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: dashFadeIn 0.5s ease;
}

@keyframes dashFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Row Layouts ─── */
.dash-row-1 {
  display: grid;
  grid-template-columns: 240px 1fr 280px;
  gap: 16px;
}

.dash-row-3 {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
}

@media (max-width: 1024px) {
  .dash-row-1 {
    grid-template-columns: 1fr 1fr;
  }
  .dash-row-1 .dash-card-wins {
    grid-column: 1 / -1;
  }
  .dash-row-3 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .dash-row-1 {
    grid-template-columns: 1fr;
  }
}

/* ─── Card Base ─── */
.dash-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.dash-card:hover {
  border-color: color-mix(in srgb, var(--amber) 30%, var(--border));
  box-shadow: 0 8px 30px rgba(var(--amber-rgb), 0.06);
}

.dash-card-label {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text3);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

/* ─── ATS Score Gauge ─── */
.dash-card-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-gauge-wrap {
  position: relative;
  width: 130px;
  height: 130px;
  margin-bottom: 16px;
}

.score-gauge {
  width: 100%;
  height: 100%;
}

.score-arc {
  transition: stroke-dasharray 1.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-gauge-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-gauge-num {
  font-family: var(--font-head);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.score-gauge-label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  color: var(--text3);
  margin-top: 2px;
}

.score-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.score-meta-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.score-meta-num {
  font-family: var(--font-head);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}

.score-meta-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.sparkline-wrap {
  width: 100%;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.sparkline-svg {
  width: 100%;
  height: 32px;
}

.sparkline-label {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text3);
  text-align: center;
  margin-top: 4px;
}

/* ─── Skills Heatmap ─── */
.skills-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 0;
}

.skills-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-row {
  display: grid;
  grid-template-columns: 130px 1fr 36px;
  align-items: center;
  gap: 10px;
}

.skill-name {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-name.skill-has {
  color: var(--green);
}

.skill-check {
  font-size: 14px;
  color: var(--green);
}

.skill-missing {
  font-size: 14px;
  color: var(--text3);
  opacity: 0.4;
}

.skill-bar-track {
  height: 8px;
  background: var(--bg4);
  border-radius: 99px;
  overflow: hidden;
}

.skill-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-bar-has {
  background: linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 70%, #34d399));
}

.skill-bar-miss {
  background: linear-gradient(90deg, var(--red), color-mix(in srgb, var(--red) 70%, #f87171));
  opacity: 0.6;
}

.skill-count {
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--text3);
  text-align: right;
}

/* ─── Quick Wins ─── */
.wins-empty {
  padding: 24px 8px;
}

.wins-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.win-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: color-mix(in srgb, var(--amber) 5%, var(--bg3));
  border: 1px solid color-mix(in srgb, var(--amber) 15%, var(--border));
  border-radius: 10px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.win-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(var(--amber-rgb), 0.1);
}

.win-impact {
  font-family: var(--font-head);
  font-size: 18px;
  font-weight: 700;
  color: var(--green);
  min-width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.win-body {
  flex: 1;
  min-width: 0;
}

.win-skill {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  text-transform: capitalize;
  margin-bottom: 2px;
}

.win-desc {
  font-size: 11px;
  color: var(--text3);
  line-height: 1.5;
}

/* ─── Pipeline / Funnel ─── */
.dash-card-pipeline {
  padding: 24px;
}

.pipeline-funnel {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.funnel-stage {
  display: grid;
  grid-template-columns: 1fr 100px;
  align-items: center;
  gap: 12px;
  position: relative;
}

.funnel-bar-wrap {
  height: 32px;
  display: flex;
  align-items: center;
}

.funnel-bar {
  height: 100%;
  border-radius: 6px;
  min-width: 28px;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.funnel-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.funnel-num {
  font-family: var(--font-head);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

.funnel-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.funnel-rate {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  padding: 4px 0;
  grid-column: 1 / -1;
}

.pipeline-insight {
  margin-top: 16px;
  padding: 14px 16px;
  background: color-mix(in srgb, var(--amber) 6%, var(--bg3));
  border: 1px solid color-mix(in srgb, var(--amber) 18%, var(--border));
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--text2);
  line-height: 1.5;
}

.pipeline-insight .material-symbols-outlined {
  color: var(--amber);
  flex-shrink: 0;
  margin-top: 1px;
}

/* ─── Market Fit ─── */
.market-section {
  margin-bottom: 0;
}

.market-sub-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text2);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-weight: 500;
}

.market-empty {
  padding: 16px 0;
  text-align: center;
}

.company-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.company-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.company-item:hover {
  background: var(--bg3);
}

.company-rank {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--bg4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--amber);
  flex-shrink: 0;
}

.company-name {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  flex-shrink: 0;
}

/* Keywords */
.keyword-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-family: var(--font-mono);
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text2);
  transition: all 0.15s ease;
}

.keyword-tag:hover {
  border-color: var(--amber);
  background: color-mix(in srgb, var(--amber) 8%, var(--bg3));
}

.keyword-tag.keyword-hot {
  background: color-mix(in srgb, var(--amber) 10%, var(--bg3));
  border-color: color-mix(in srgb, var(--amber) 25%, var(--border));
  color: var(--text);
  font-weight: 500;
}

.keyword-badge {
  font-size: 9px;
  background: var(--bg4);
  padding: 1px 5px;
  border-radius: 99px;
  color: var(--text3);
}

/* ─── CV History Timeline ─── */
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

.cv-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 380px;
  overflow-y: auto;
}

.cv-timeline-item {
  display: flex;
  gap: 14px;
  position: relative;
  padding-bottom: 16px;
}

.cv-timeline-item:last-child {
  padding-bottom: 0;
}

.cv-timeline-item:last-child .cv-timeline-line {
  display: none;
}

.cv-timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 99px;
  background: var(--amber);
  flex-shrink: 0;
  margin-top: 4px;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--amber) 15%, transparent);
  z-index: 1;
}

.cv-timeline-line {
  position: absolute;
  top: 16px;
  left: 4px;
  width: 2px;
  bottom: 0;
  background: var(--border);
}

.cv-timeline-content {
  flex: 1;
  min-width: 0;
}

.cv-timeline-position {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
  margin-bottom: 2px;
}

.cv-timeline-company {
  font-size: 11px;
  color: var(--amber);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.cv-timeline-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cv-timeline-date {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
}

.cv-timeline-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--green) 12%, var(--bg3));
  color: var(--green);
  font-weight: 600;
}

.cv-badge-general {
  background: var(--bg4);
  color: var(--text3);
}

.history-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
</style>
