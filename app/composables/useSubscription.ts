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

  // Usamos useAsyncData o useFetch para obtener las estadísticas del usuario actual
  // La clave única asegura que no se mezcle si el usuario cambia
  const { data: usageStats, pending: loadingStats, refresh: refreshStats } = useFetch<UsageStatsResponse>('/api/usage/stats', {
    key: `usage-stats-${user.value?.id}`,
    // Solo hacemos la petición si el usuario está logueado
    immediate: !!user.value?.id,
    default: () => ({
      cvs: 0,
      analyses: 0,
      limits: { MAX_CVS: 1, MAX_ANALYSES: 3 },
      canGenerateCV: true,
      canAnalyzeOffer: true,
      remainingCVs: 1,
      remainingAnalyses: 3,
      subscriptionName: 'free_trial'
    })
  })

  // Sincronizar el usuario de la sesión si detectamos un cambio de plan en los stats respecto a la cookie
  watch(() => usageStats.value.subscriptionName, async (newName) => {
    if (newName && user.value && newName !== user.value.subscription_name) {
      const { fetch: fetchSession } = useUserSession()
      await fetchSession()
    }
  }, { immediate: true })

  // Refrescar stats cuando el usuario vuelve a la pestaña, pero con límite de tiempo
  // Usamos un estado para que persista entre navegaciones de página dentro de la misma sesión
  const lastRefresh = useState('last-subscription-refresh', () => Date.now())

  if (import.meta.client) {
    const handleFocus = () => {
      const now = Date.now()
      // Solo refrescamos si han pasado más de 5 minutos (300.000 ms)
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

  // Detectar el tipo de plan actual - Priorizamos los datos frescos de la DB sobre la sesión
  const currentPlan = computed(() => usageStats.value.subscriptionName || user.value?.subscription_name || 'free_trial')
  const isFreeTrial = computed(() => currentPlan.value === 'free_trial')
  const isPro = computed(() => currentPlan.value === 'pro')

  // Lógicas de validación
  // Ahora la fuente de verdad proviene del backend
  const canGenerateCV = computed(() => usageStats.value.canGenerateCV)
  const canAnalyzeOffer = computed(() => usageStats.value.canAnalyzeOffer)

  // Calcular cuántos le quedan (útil para mostrar mensajitos de "Te quedan X intentos")
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
