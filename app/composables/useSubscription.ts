// Lógica centralizada para manejar límites y accesos de suscripción

interface UsageStatsResponse {
  cvs: number
  analyses: number
  limits: { MAX_CVS: number; MAX_ANALYSES: number }
  canGenerateCV: boolean
  canAnalyzeOffer: boolean
  remainingCVs: number
  remainingAnalyses: number
  subscriptionName: string
}

export function useSubscription() {
  const { user } = useAuth()
  
  // Estado global compartido para las estadísticas
  // Esto asegura que todos los componentes vean lo mismo al mismo tiempo
  const usageStats = useState<UsageStatsResponse>(`global-usage-stats-${user.value?.id}`, () => ({
    cvs: 0, 
    analyses: 0,
    limits: { MAX_CVS: 1, MAX_ANALYSES: 3 },
    canGenerateCV: true,
    canAnalyzeOffer: true,
    remainingCVs: 1,
    remainingAnalyses: 3,
    subscriptionName: 'free_trial'
  }))

  const { data, status, refresh: refreshStats } = useFetch<UsageStatsResponse>('/api/usage/stats', {
    key: `api-usage-stats-${user.value?.id}`,
    immediate: !!user.value?.id,
    onResponse({ response }) {
      if (response._data) {
        usageStats.value = response._data
      }
    }
  })

  const loadingStats = computed(() => status.value === 'pending')

  // Sincronizar el usuario de la sesión si detectamos un cambio de plan en los stats respecto a la cookie
  watch(() => usageStats.value.subscriptionName, async (newName) => {
    if (newName && user.value && newName !== user.value.subscription_name) {
      const { fetch: fetchSession } = useUserSession()
      await fetchSession()
    }
  }, { immediate: true })

  // Refrescar cada vez que vuelve a la pestaña, pero con límite de tiempo
  const lastRefresh = useState('last-subscription-refresh', () => Date.now())
  if (import.meta.client) {
    const handleFocus = () => {
      const now = Date.now()
      if (now - lastRefresh.value > 300000) {
        lastRefresh.value = now
        refreshStats()
      }
    }
    window.addEventListener('focus', handleFocus)
    onBeforeUnmount(() => {
      window.removeEventListener('focus', handleFocus)
    })
  }

  // Detectar el tipo de plan actual - Usamos el estado global como única fuente de verdad
  const currentPlan = computed(() => usageStats.value.subscriptionName || 'free_trial')
  const isFreeTrial = computed(() => currentPlan.value === 'free_trial')
  const isPro = computed(() => currentPlan.value === 'pro')

  // Lógicas de validación
  const canGenerateCV = computed(() => usageStats.value.canGenerateCV)
  const canAnalyzeOffer = computed(() => usageStats.value.canAnalyzeOffer)
  const remainingCVs = computed(() => usageStats.value.remainingCVs)
  const remainingAnalyses = computed(() => usageStats.value.remainingAnalyses)

  // Estado global para mostrar el modal de mejora de plan
  const showUpgradeModal = useState('show-upgrade-modal', () => false)

  return {
    usageStats,
    loadingStats,
    refreshStats,

    isFreeTrial,
    isPro,

    canGenerateCV,
    canAnalyzeOffer,

    remainingCVs,
    remainingAnalyses,

    showUpgradeModal
  }
}
