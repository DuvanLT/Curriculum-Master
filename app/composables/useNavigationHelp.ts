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

const navigationHelpItems: NavigationHelpItem[] = [
  {
    id: 'analisis',
    to: '/analisis',
    label: 'Analizar Vacante',
    icon: 'search',
    description: 'Descubre qué tan compatible eres con el puesto, qué detalles le faltan a tu CV y cómo mejorarlo para destacar.',
    tip: 'Ideal para decidir rapido si vale la pena postularte o adaptar tu CV.',
    group: 'primary'
  },
  {
    id: 'generador',
    to: '/generador',
    label: 'Constructor CV',
    icon: 'description',
    description: 'Crea una version de tu Curriculum Vitae enfocada en una oferta usando tu Perfil Maestro como base.',
    tip: 'Adapta tu perfil a cada oferta al instante y destaca lo que la empresa busca, sin reescribir todo desde cero.',
    group: 'primary'
  },
  {
    id: 'coach',
    to: '/coach',
    label: 'Ezra',
    icon: 'smart_toy',
    description: 'Tu coach con IA para practicar argumentos, resolver dudas y mejorar tu estrategia laboral.',
    tip: 'Usalo cuando necesites ideas, feedback o apoyo antes de una postulacion.',
    group: 'primary'
  },
  {
    id: 'pasos',
    to: '/pasos',
    label: 'Mi Ruta',
    icon: 'fact_check',
    description: 'Organiza tus siguientes pasos y te muestra que tareas te faltan para avanzar.',
    tip: 'Sirve como tablero personal para no perder el hilo del proceso.',
    group: 'primary'
  },
  {
    id: 'entrevista',
    to: '/entrevista',
    label: 'Practicar Entrevista',
    icon: 'videocam',
    description: 'Simula entrevistas y practica respuestas antes de hablar con reclutadores.',
    tip: 'Muy util para entrenar seguridad, estructura y claridad en tus respuestas.',
    group: 'primary',
    badge: 'BETA'
  },
  {
    id: 'aplicaciones',
    to: '/aplicaciones',
    label: 'Mis Aplicaciones',
    icon: 'view_kanban',
    description: 'Lleva el control de las vacantes guardadas, fechas y estado de cada postulacion.',
    tip: 'Piensalo como tu linea de tiempo laboral personal de postulaciones.',
    group: 'primary'
  },
  {
    id: 'ofertas',
    to: '/ofertas',
    label: 'Bolsa de Empleo',
    icon: 'work',
    description: 'Explora vacantes y envialas directo al analisis o al constructor de CV.',
    tip: 'Es el mejor punto de partida cuando aun estas buscando oportunidades.',
    group: 'primary'
  },
  {
    id: 'settings',
    to: '/settings',
    label: 'Ajustes',
    icon: 'settings',
    description: 'Administra tu cuenta, privacidad y configuraciones generales.',
    tip: 'Aqui gestionas lo sensible: sesion, datos y acciones de cuenta.',
    group: 'settings'
  },
  {
    id: 'perfil',
    to: '/perfil',
    label: 'Perfil Maestro',
    icon: 'person',
    description: 'Es la base de tu experiencia, estudios y datos personales para toda la app.',
    tip: 'Mientras mejor este tu perfil, mejores seran los analisis y CVs generados.',
    group: 'profile'
  }
]

const extraSectionHelp: HelpMatcher[] = [
  {
    title: 'Importar CV',
    description: 'Carga tu hoja de vida para rellenar mas rapido el Perfil Maestro.',
    tip: 'Despues puedes corregir o enriquecer cada dato manualmente.',
    match: path => path === '/importar-cv' || path.startsWith('/importar-cv/')
  },
  {
    title: 'Examen de Habilidades',
    description: 'Descubre fortalezas y habilidades que luego puedes sumar a tu Perfil Maestro.',
    tip: 'Conviene hacerlo si aun no tienes claro como describir tu propuesta profesional.',
    match: path => path === '/examen' || path.startsWith('/examen/')
  }
]

const fallbackSectionHelp: SectionHelp = {
  title: 'BringJobs',
  description: 'Esta vista forma parte de tu proceso para preparar, mejorar y seguir tus postulaciones.',
  tip: 'Puedes moverte por el sidebar para cambiar de herramienta cuando lo necesites.'
}

const buildMatch = (path: string) => (currentPath: string) => currentPath === path || currentPath.startsWith(`${path}/`)

const routeHelpMatchers: HelpMatcher[] = [
  ...navigationHelpItems.map(item => ({
    title: item.label,
    description: item.description,
    tip: item.tip,
    match: buildMatch(item.to)
  })),
  ...extraSectionHelp
]

export const resolveSectionHelp = (path: string): SectionHelp => {
  return routeHelpMatchers.find(entry => entry.match(path)) ?? fallbackSectionHelp
}

export const useNavigationHelp = () => {
  const route = useRoute()
  const sidebarTourSignal = useState<number>('sidebar-tour-signal', () => 0)

  const currentSectionHelp = computed(() => resolveSectionHelp(route.path))
  const primaryNavigationItems = computed(() => navigationHelpItems.filter(item => item.group === 'primary'))
  const settingsNavigationItems = computed(() => navigationHelpItems.filter(item => item.group === 'settings'))
  const profileNavigationItem = computed(() => navigationHelpItems.find(item => item.group === 'profile') ?? null)

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
