// Lógica centralizada para manejar límites y accesos de suscripción

interface UsageStatsResponse {
  cvs: number
  analyses: number
  limits: { MAX_CVS: number; MAX_ANALYSES: number }
  canGenerateCV: boolean
  canAnalyzeOffer: boolean
  remainingCVs: number
  remainingAnalyses: number
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
      remainingAnalyses: 3
    })
  })

  // Detectar el tipo de plan actual
  const isFreeTrial = computed(() => user.value?.subscription_name === 'free_trial' || !user.value?.subscription_name)
  const isPro = computed(() => user.value?.subscription_name === 'pro')

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
