interface NavigationHelpItem {
  id: string
  to: string
  label: string
  icon: string
  description: string
  tip: string
  group: 'primary' | 'settings' | 'profile'
  badge?: string
}

interface SectionHelp {
  title: string
  description: string
  tip: string
}

interface HelpMatcher extends SectionHelp {
  match: (path: string) => boolean
}



const buildMatch = (path: string) => (currentPath: string) => currentPath === path || currentPath.startsWith(`${path}/`)

export const useNavigationHelp = () => {
  const route = useRoute()
  const { t } = useI18n()
  const sidebarTourSignal = useState<number>('sidebar-tour-signal', () => 0)

  const navigationHelpItems = computed<NavigationHelpItem[]>(() => [
    {
      id: 'dashboard',
      to: '/dashboard',
      label: t('sidebar.items.dashboard.label'),
      icon: 'dashboard',
      description: t('sidebar.items.dashboard.description'),
      tip: t('sidebar.items.dashboard.tip'),
      group: 'primary'
    },
    {
      id: 'analysis',
      to: '/analysis',
      label: t('sidebar.items.analisis.label'),
      icon: 'search',
      description: t('sidebar.items.analisis.description'),
      tip: t('sidebar.items.analisis.tip'),
      group: 'primary'
    },
    {
      id: 'generator-cv',
      to: '/generator-cv',
      label: t('sidebar.items.generador.label'),
      icon: 'description',
      description: t('sidebar.items.generador.description'),
      tip: t('sidebar.items.generador.tip'),
      group: 'primary'
    },
    {
      id: 'coach',
      to: '/coach',
      label: t('sidebar.items.coach.label'),
      icon: 'smart_toy',
      description: t('sidebar.items.coach.description'),
      tip: t('sidebar.items.coach.tip'),
      group: 'primary'
    },
    {
      id: 'steps',
      to: '/steps',
      label: t('sidebar.items.pasos.label'),
      icon: 'fact_check',
      description: t('sidebar.items.pasos.description'),
      tip: t('sidebar.items.pasos.tip'),
      group: 'primary'
    },
    {
      id: 'interview',
      to: '/interview',
      label: t('sidebar.items.entrevista.label'),
      icon: 'videocam',
      description: t('sidebar.items.entrevista.description'),
      tip: t('sidebar.items.entrevista.tip'),
      group: 'primary',
      badge: 'BETA'
    },
    {
      id: 'jobs-applications',
      to: '/jobs-applications',
      label: t('sidebar.items.aplicaciones.label'),
      icon: 'view_kanban',
      description: t('sidebar.items.aplicaciones.description'),
      tip: t('sidebar.items.aplicaciones.tip'),
      group: 'primary'
    },
    {
      id: 'job-offers',
      to: '/job-offers',
      label: t('sidebar.items.ofertas.label'),
      icon: 'work',
      description: t('sidebar.items.ofertas.description'),
      tip: t('sidebar.items.ofertas.tip'),
      group: 'primary'
    },
    {
      id: 'settings',
      to: '/settings',
      label: t('sidebar.items.settings_nav.label'),
      icon: 'settings',
      description: t('sidebar.items.settings_nav.description'),
      tip: t('sidebar.items.settings_nav.tip'),
      group: 'settings'
    },
    {
      id: 'profile',
      to: '/profile',
      label: t('sidebar.items.perfil.label'),
      icon: 'person',
      description: t('sidebar.items.perfil.description'),
      tip: t('sidebar.items.perfil.tip'),
      group: 'profile'
    }
  ])

  const extraSectionHelp = computed<HelpMatcher[]>(() => [
    {
      title: t('sidebar.extra_help.importar_cv.title'),
      description: t('sidebar.extra_help.importar_cv.description'),
      tip: t('sidebar.extra_help.importar_cv.tip'),
      match: path => path === '/import-cv' || path.startsWith('/import-cv/')
    },
    {
      title: t('sidebar.extra_help.examen.title'),
      description: t('sidebar.extra_help.examen.description'),
      tip: t('sidebar.extra_help.examen.tip'),
      match: path => path === '/exam' || path.startsWith('/exam/')
    }
  ])

  const fallbackSectionHelp = computed<SectionHelp>(() => ({
    title: t('sidebar.fallback_help.title'),
    description: t('sidebar.fallback_help.description'),
    tip: t('sidebar.fallback_help.tip')
  }))

  const routeHelpMatchers = computed<HelpMatcher[]>(() => [
    ...navigationHelpItems.value.map(item => ({
      title: item.label,
      description: item.description,
      tip: item.tip,
      match: buildMatch(item.to)
    })),
    ...extraSectionHelp.value
  ])

  const currentSectionHelp = computed(() => {
    return routeHelpMatchers.value.find(entry => entry.match(route.path)) ?? fallbackSectionHelp.value
  })

  const primaryNavigationItems = computed(() => navigationHelpItems.value.filter(item => item.group === 'primary'))
  const settingsNavigationItems = computed(() => navigationHelpItems.value.filter(item => item.group === 'settings'))
  const profileNavigationItem = computed(() => navigationHelpItems.value.find(item => item.group === 'profile') ?? null)

  const requestSidebarTour = () => {
    sidebarTourSignal.value += 1
  }

  return {
    currentSectionHelp,
    navigationHelpItems,
    primaryNavigationItems,
    settingsNavigationItems,
    profileNavigationItem,
    sidebarTourSignal,
    requestSidebarTour
  }
}
