export const EXAM_QUESTION_COUNT = 16
const MAX_SKILL_APPEARANCES = 4

type DbLike = {
  execute: (statement: any) => Promise<any>
}

const globalForExamSeed = globalThis as typeof globalThis & {
  __competencyExamSeedPromise?: Promise<void>
  __competencyExamQuestionPoolPromise?: Promise<ExamQuestionRecord[]>
}

export interface ExamSkill {
  key: string
  label: string
}

export interface ExamOptionSeed {
  id: string
  text: string
  skillKey: string
  scoreValue?: number
}

export interface ExamQuestionSeed {
  id: string
  category: string
  text: string
  options: ExamOptionSeed[]
}

export interface ExamQuestionRecord {
  id: string
  category: string
  text: string
  options: Array<{
    id: string
    text: string
    skillKey: string
    scoreValue: number
    orderIndex: number
  }>
}

export interface ExamAnswerInput {
  question_id?: string
  option_id?: string
  questionId?: string
  optionId?: string
}

const CATEGORY_ORDER = ['situacional', 'estrategico', 'colaborativo', 'adaptativo']

export const EXAM_SKILLS: ExamSkill[] = [
  { key: 'results_orientation', label: 'Orientación a Resultados' },
  { key: 'assertive_communication', label: 'Comunicación Asertiva' },
  { key: 'teamwork_leadership', label: 'Liderazgo y Trabajo en Equipo' },
  { key: 'time_management', label: 'Organización y Gestión del Tiempo' },
  { key: 'critical_thinking', label: 'Pensamiento Crítico y Analítico' },
  { key: 'adaptability_resilience', label: 'Adaptabilidad y Resiliencia' },
  { key: 'ethics_responsibility', label: 'Ética y Responsabilidad' },
  { key: 'creativity_innovation', label: 'Creatividad e Innovación' },
  { key: 'decision_making', label: 'Toma de Decisiones' },
  { key: 'problem_solving', label: 'Resolución de Problemas' },
  { key: 'proactivity_initiative', label: 'Proactividad e Iniciativa' },
  { key: 'continuous_learning', label: 'Aprendizaje Continuo' },
  { key: 'stress_management', label: 'Gestión del Estrés' },
  { key: 'negotiation_influence', label: 'Negociación e Influencia' },
  { key: 'attention_to_detail', label: 'Atención al Detalle' },
  { key: 'strategic_vision', label: 'Visión Estratégica' }
]

export const EXAM_QUESTION_SEEDS: ExamQuestionSeed[] = [
  {
    id: 'exam_q01',
    category: 'situacional',
    text: 'Un proyecto urgente presenta un error crítico justo antes de entregarlo.',
    options: [
      { id: 'exam_q01_a', text: 'Ajustar lo necesario para cumplir con la entrega en el tiempo previsto.', skillKey: 'results_orientation' },
      { id: 'exam_q01_b', text: 'Revisar el origen del error para evitar que vuelva a ocurrir.', skillKey: 'critical_thinking' },
      { id: 'exam_q01_c', text: 'Coordinar con el equipo para resolverlo de la mejor forma posible.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q02',
    category: 'adaptativo',
    text: 'Te asignan una tarea completamente nueva para ti.',
    options: [
      { id: 'exam_q02_a', text: 'Explorar recursos y aprender lo necesario de forma autónoma.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q02_b', text: 'Estructurar un plan claro antes de empezar a ejecutarla.', skillKey: 'time_management' },
      { id: 'exam_q02_c', text: 'Plantear una forma diferente de abordar la tarea.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q03',
    category: 'colaborativo',
    text: 'Un compañero está retrasando parte del trabajo.',
    options: [
      { id: 'exam_q03_a', text: 'Conversar directamente para entender la situación.', skillKey: 'assertive_communication' },
      { id: 'exam_q03_b', text: 'Asegurar que el avance del proyecto no se vea comprometido.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q03_c', text: 'Apoyarlo para que el equipo mantenga el ritmo.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q04',
    category: 'situacional',
    text: 'Un cliente solicita un cambio difícil en poco tiempo.',
    options: [
      { id: 'exam_q04_a', text: 'Proponer una solución viable dentro del plazo.', skillKey: 'assertive_communication' },
      { id: 'exam_q04_b', text: 'Explorar herramientas o métodos que aceleren el proceso.', skillKey: 'creativity_innovation' },
      { id: 'exam_q04_c', text: 'Reorganizar prioridades para intentar cumplir.', skillKey: 'results_orientation' }
    ]
  },
  {
    id: 'exam_q05',
    category: 'adaptativo',
    text: 'El ambiente de trabajo está tenso por presión.',
    options: [
      { id: 'exam_q05_a', text: 'Mantener el enfoque en los objetivos pese al entorno.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q05_b', text: 'Generar un espacio breve para alinear al equipo.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q05_c', text: 'Identificar qué está generando la tensión.', skillKey: 'critical_thinking' }
    ]
  },
  {
    id: 'exam_q06',
    category: 'situacional',
    text: 'Detectas un error en tu trabajo antes de que escale.',
    options: [
      { id: 'exam_q06_a', text: 'Gestionarlo rápidamente para minimizar impacto.', skillKey: 'results_orientation' },
      { id: 'exam_q06_b', text: 'Comunicarlo junto con una posible solución.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q06_c', text: 'Registrar lo ocurrido para mejorar procesos.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q07',
    category: 'estrategico',
    text: 'Te proponen liderar una iniciativa nueva.',
    options: [
      { id: 'exam_q07_a', text: 'Definir objetivos y coordinar al equipo.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q07_b', text: 'Evaluar viabilidad antes de comprometerte.', skillKey: 'critical_thinking' },
      { id: 'exam_q07_c', text: 'Diseñar una forma innovadora de ejecutarla.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q08',
    category: 'estrategico',
    text: 'Debes elegir entre dos proveedores.',
    options: [
      { id: 'exam_q08_a', text: 'Priorizar el cumplimiento de resultados.', skillKey: 'results_orientation' },
      { id: 'exam_q08_b', text: 'Evaluar cumplimiento de normas y criterios.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q08_c', text: 'Optar por una solución más innovadora.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q09',
    category: 'colaborativo',
    text: 'Una reunión pierde el enfoque inicial.',
    options: [
      { id: 'exam_q09_a', text: 'Redirigir la conversación hacia los objetivos.', skillKey: 'time_management' },
      { id: 'exam_q09_b', text: 'Escuchar para entender el problema de fondo.', skillKey: 'critical_thinking' },
      { id: 'exam_q09_c', text: 'Intervenir con una propuesta clara.', skillKey: 'assertive_communication' }
    ]
  },
  {
    id: 'exam_q10',
    category: 'colaborativo',
    text: 'Te piden colaborar en algo fuera de tu rol.',
    options: [
      { id: 'exam_q10_a', text: 'Apoyar si contribuye al objetivo general.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q10_b', text: 'Aprovechar para desarrollar nuevas habilidades.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q10_c', text: 'Aclarar el alcance de tus responsabilidades.', skillKey: 'ethics_responsibility' }
    ]
  },
  {
    id: 'exam_q11',
    category: 'colaborativo',
    text: 'Recibes retroalimentación con la que no estás totalmente de acuerdo.',
    options: [
      { id: 'exam_q11_a', text: 'Responder con argumentos claros y respetuosos.', skillKey: 'assertive_communication' },
      { id: 'exam_q11_b', text: 'Evaluar objetivamente si puedes mejorar algo.', skillKey: 'critical_thinking' },
      { id: 'exam_q11_c', text: 'Ajustar tu enfoque para evitar fricciones futuras.', skillKey: 'adaptability_resilience' }
    ]
  },
  {
    id: 'exam_q12',
    category: 'estrategico',
    text: 'Debes reducir costos en un proyecto.',
    options: [
      { id: 'exam_q12_a', text: 'Optimizar procesos sin afectar resultados.', skillKey: 'time_management' },
      { id: 'exam_q12_b', text: 'Buscar soluciones alternativas más eficientes.', skillKey: 'creativity_innovation' },
      { id: 'exam_q12_c', text: 'Tomar decisiones alineadas con el equipo.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q13',
    category: 'situacional',
    text: 'Debes organizar una actividad con poco tiempo.',
    options: [
      { id: 'exam_q13_a', text: 'Priorizar lo esencial para cumplir el objetivo.', skillKey: 'results_orientation' },
      { id: 'exam_q13_b', text: 'Planificar cada paso cuidadosamente.', skillKey: 'time_management' },
      { id: 'exam_q13_c', text: 'Distribuir tareas para avanzar más rápido.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q14',
    category: 'colaborativo',
    text: 'Alguien te pide ayuda para tomar una decisión importante.',
    options: [
      { id: 'exam_q14_a', text: 'Escuchar activamente y responder con claridad.', skillKey: 'assertive_communication' },
      { id: 'exam_q14_b', text: 'Analizar posibles consecuencias.', skillKey: 'critical_thinking' },
      { id: 'exam_q14_c', text: 'Sugerir alternativas diferentes.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q15',
    category: 'adaptativo',
    text: 'Una situación externa interrumpe tu trabajo.',
    options: [
      { id: 'exam_q15_a', text: 'Buscar una solución alternativa inmediata.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q15_b', text: 'Informar a los involucrados del cambio.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q15_c', text: 'Reorganizar tareas para aprovechar el tiempo.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q16',
    category: 'estrategico',
    text: 'Necesitas alcanzar una meta personal importante.',
    options: [
      { id: 'exam_q16_a', text: 'Actuar directamente sobre lo necesario.', skillKey: 'results_orientation' },
      { id: 'exam_q16_b', text: 'Analizar tu situación actual antes de actuar.', skillKey: 'critical_thinking' },
      { id: 'exam_q16_c', text: 'Explorar nuevas formas de lograrlo.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q17',
    category: 'adaptativo',
    text: 'Te enfrentas a una situación nueva en tu entorno.',
    options: [
      { id: 'exam_q17_a', text: 'Organizar lo que debes resolver primero.', skillKey: 'time_management' },
      { id: 'exam_q17_b', text: 'Aprender lo necesario para adaptarte.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q17_c', text: 'Involucrar a otros para facilitar el proceso.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q18',
    category: 'colaborativo',
    text: 'Surge un conflicto con otra persona.',
    options: [
      { id: 'exam_q18_a', text: 'Hablar directamente para aclarar.', skillKey: 'assertive_communication' },
      { id: 'exam_q18_b', text: 'Revisar normas o acuerdos existentes.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q18_c', text: 'Buscar un punto medio que beneficie a ambos.', skillKey: 'teamwork_leadership' }
    ]
  },
  {
    id: 'exam_q19',
    category: 'adaptativo',
    text: 'Quieres desarrollar una nueva habilidad.',
    options: [
      { id: 'exam_q19_a', text: 'Practicar de forma constante.', skillKey: 'results_orientation' },
      { id: 'exam_q19_b', text: 'Buscar retroalimentación externa.', skillKey: 'assertive_communication' },
      { id: 'exam_q19_c', text: 'Probar distintos métodos hasta encontrar el ideal.', skillKey: 'adaptability_resilience' }
    ]
  },
  {
    id: 'exam_q20',
    category: 'estrategico',
    text: 'Debes coordinar un evento con varias variables.',
    options: [
      { id: 'exam_q20_a', text: 'Asignar responsabilidades claras.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q20_b', text: 'Anticipar posibles riesgos.', skillKey: 'critical_thinking' },
      { id: 'exam_q20_c', text: 'Controlar recursos y presupuesto.', skillKey: 'ethics_responsibility' }
    ]
  },
  {
    id: 'exam_q21',
    category: 'situacional',
    text: 'Una situación cambia inesperadamente.',
    options: [
      { id: 'exam_q21_a', text: 'Improvisar con los recursos disponibles.', skillKey: 'creativity_innovation' },
      { id: 'exam_q21_b', text: 'Comunicar el cambio claramente.', skillKey: 'assertive_communication' },
      { id: 'exam_q21_c', text: 'Actuar rápido para resolverlo.', skillKey: 'results_orientation' }
    ]
  },
  {
    id: 'exam_q22',
    category: 'situacional',
    text: 'Encuentras algo importante que no es tuyo.',
    options: [
      { id: 'exam_q22_a', text: 'Intentar ubicar directamente al responsable.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q22_b', text: 'Pensar dónde podría recuperarlo más fácilmente.', skillKey: 'critical_thinking' },
      { id: 'exam_q22_c', text: 'Llevarlo a un punto formal de entrega.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q23',
    category: 'adaptativo',
    text: 'Un imprevisto afecta tu puntualidad.',
    options: [
      { id: 'exam_q23_a', text: 'Informar con claridad la situación.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q23_b', text: 'Buscar alternativas para reducir el retraso.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q23_c', text: 'Aprovechar el tiempo disponible de otra forma.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q24',
    category: 'colaborativo',
    text: 'Un grupo del que haces parte no logra buenos resultados.',
    options: [
      { id: 'exam_q24_a', text: 'Analizar qué factores están fallando.', skillKey: 'critical_thinking' },
      { id: 'exam_q24_b', text: 'Mantener el ánimo y cohesión del grupo.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q24_c', text: 'Proponer un enfoque distinto.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q25',
    category: 'estrategico',
    text: 'Tienes que tomar una decisión importante con información incompleta.',
    options: [
      { id: 'exam_q25_a', text: 'Tomar una decisión basada en la mejor información disponible.', skillKey: 'decision_making' },
      { id: 'exam_q25_b', text: 'Analizar escenarios posibles antes de decidir.', skillKey: 'critical_thinking' },
      { id: 'exam_q25_c', text: 'Consultar con otros para tener más perspectivas.', skillKey: 'assertive_communication' }
    ]
  },
  {
    id: 'exam_q26',
    category: 'situacional',
    text: 'Un problema inesperado bloquea tu avance.',
    options: [
      { id: 'exam_q26_a', text: 'Buscar soluciones prácticas rápidamente.', skillKey: 'problem_solving' },
      { id: 'exam_q26_b', text: 'Mantener la calma mientras evalúas opciones.', skillKey: 'stress_management' },
      { id: 'exam_q26_c', text: 'Intentar un enfoque completamente diferente.', skillKey: 'creativity_innovation' }
    ]
  },
  {
    id: 'exam_q27',
    category: 'estrategico',
    text: 'Nadie está tomando iniciativa en un proyecto.',
    options: [
      { id: 'exam_q27_a', text: 'Dar el primer paso sin que me lo pidan.', skillKey: 'proactivity_initiative' },
      { id: 'exam_q27_b', text: 'Organizar al equipo para empezar.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q27_c', text: 'Definir una dirección clara antes de actuar.', skillKey: 'strategic_vision' }
    ]
  },
  {
    id: 'exam_q28',
    category: 'adaptativo',
    text: 'Debes aprender algo nuevo en poco tiempo.',
    options: [
      { id: 'exam_q28_a', text: 'Dedicar tiempo intensivo de aprendizaje.', skillKey: 'continuous_learning' },
      { id: 'exam_q28_b', text: 'Aplicarlo directamente mientras aprendes.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q28_c', text: 'Buscar atajos o recursos eficientes.', skillKey: 'proactivity_initiative' }
    ]
  },
  {
    id: 'exam_q29',
    category: 'colaborativo',
    text: 'Una negociación no está avanzando.',
    options: [
      { id: 'exam_q29_a', text: 'Buscar puntos en común para avanzar.', skillKey: 'negotiation_influence' },
      { id: 'exam_q29_b', text: 'Reformular la propuesta.', skillKey: 'creativity_innovation' },
      { id: 'exam_q29_c', text: 'Mantener firme el objetivo principal.', skillKey: 'results_orientation' }
    ]
  },
  {
    id: 'exam_q30',
    category: 'situacional',
    text: 'Debes revisar un trabajo antes de entregarlo.',
    options: [
      { id: 'exam_q30_a', text: 'Verificar cada detalle cuidadosamente.', skillKey: 'attention_to_detail' },
      { id: 'exam_q30_b', text: 'Asegurar que cumple el objetivo principal.', skillKey: 'results_orientation' },
      { id: 'exam_q30_c', text: 'Optimizarlo si encuentras mejoras.', skillKey: 'problem_solving' }
    ]
  },
  {
    id: 'exam_q31',
    category: 'estrategico',
    text: 'Debes planear algo a largo plazo.',
    options: [
      { id: 'exam_q31_a', text: 'Definir objetivos futuros claros.', skillKey: 'strategic_vision' },
      { id: 'exam_q31_b', text: 'Dividirlo en pasos concretos.', skillKey: 'time_management' },
      { id: 'exam_q31_c', text: 'Evaluar riesgos potenciales.', skillKey: 'critical_thinking' }
    ]
  },
  {
    id: 'exam_q32',
    category: 'adaptativo',
    text: 'El trabajo empieza a acumularse y sientes presión.',
    options: [
      { id: 'exam_q32_a', text: 'Mantener la calma y priorizar.', skillKey: 'stress_management' },
      { id: 'exam_q32_b', text: 'Organizar tareas por importancia.', skillKey: 'time_management' },
      { id: 'exam_q32_c', text: 'Actuar rápidamente para avanzar.', skillKey: 'results_orientation' }
    ]
  },
  {
    id: 'exam_q33',
    category: 'estrategico',
    text: 'Te asignan liderar un proyecto con objetivos poco claros.',
    options: [
      { id: 'exam_q33_a', text: 'Definir una dirección clara antes de avanzar.', skillKey: 'strategic_vision' },
      { id: 'exam_q33_b', text: 'Reunir al equipo para alinear expectativas.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q33_c', text: 'Tomar decisiones rápidas para generar tracción.', skillKey: 'decision_making' }
    ]
  },
  {
    id: 'exam_q34',
    category: 'estrategico',
    text: 'Notas que un proceso se puede mejorar significativamente.',
    options: [
      { id: 'exam_q34_a', text: 'Proponer cambios innovadores.', skillKey: 'creativity_innovation' },
      { id: 'exam_q34_b', text: 'Implementar mejoras prácticas con iniciativa.', skillKey: 'proactivity_initiative' },
      { id: 'exam_q34_c', text: 'Analizar el impacto antes de cambiarlo.', skillKey: 'critical_thinking' }
    ]
  },
  {
    id: 'exam_q35',
    category: 'adaptativo',
    text: 'Recibes varias solicitudes importantes al mismo tiempo y el contexto cambia durante el día.',
    options: [
      { id: 'exam_q35_a', text: 'Reordenar prioridades conforme cambian las necesidades.', skillKey: 'time_management' },
      { id: 'exam_q35_b', text: 'Mantener la calma para no perder claridad.', skillKey: 'stress_management' },
      { id: 'exam_q35_c', text: 'Ajustarte rápido a las nuevas condiciones sin frenar el avance.', skillKey: 'adaptability_resilience' }
    ]
  },
  {
    id: 'exam_q36',
    category: 'situacional',
    text: 'Un cliente no está satisfecho con el resultado.',
    options: [
      { id: 'exam_q36_a', text: 'Escuchar activamente su feedback.', skillKey: 'assertive_communication' },
      { id: 'exam_q36_b', text: 'Buscar una solución inmediata.', skillKey: 'problem_solving' },
      { id: 'exam_q36_c', text: 'Negociar una alternativa viable.', skillKey: 'negotiation_influence' }
    ]
  },
  {
    id: 'exam_q37',
    category: 'colaborativo',
    text: 'Debes trabajar con alguien con quien no coincides.',
    options: [
      { id: 'exam_q37_a', text: 'Buscar puntos en común para colaborar mejor.', skillKey: 'negotiation_influence' },
      { id: 'exam_q37_b', text: 'Mantener un enfoque profesional y responsable.', skillKey: 'ethics_responsibility' },
      { id: 'exam_q37_c', text: 'Adaptarte a su estilo para facilitar el trabajo conjunto.', skillKey: 'adaptability_resilience' }
    ]
  },
  {
    id: 'exam_q38',
    category: 'adaptativo',
    text: 'Tienes que aprender una herramienta compleja rápidamente.',
    options: [
      { id: 'exam_q38_a', text: 'Estudiar recursos especializados.', skillKey: 'continuous_learning' },
      { id: 'exam_q38_b', text: 'Probar directamente mientras aprendes.', skillKey: 'proactivity_initiative' },
      { id: 'exam_q38_c', text: 'Analizar cómo se integra al flujo de trabajo.', skillKey: 'critical_thinking' }
    ]
  },
  {
    id: 'exam_q39',
    category: 'situacional',
    text: 'Un error pequeño podría generar grandes consecuencias.',
    options: [
      { id: 'exam_q39_a', text: 'Revisar cada detalle antes de continuar.', skillKey: 'attention_to_detail' },
      { id: 'exam_q39_b', text: 'Actuar rápido para solucionarlo.', skillKey: 'results_orientation' },
      { id: 'exam_q39_c', text: 'Evaluar el impacto antes de actuar.', skillKey: 'decision_making' }
    ]
  },
  {
    id: 'exam_q40',
    category: 'estrategico',
    text: 'Debes presentar una idea ante varias personas con intereses distintos.',
    options: [
      { id: 'exam_q40_a', text: 'Comunicarla de forma clara y segura.', skillKey: 'assertive_communication' },
      { id: 'exam_q40_b', text: 'Estructurarla con una visión de impacto más amplia.', skillKey: 'strategic_vision' },
      { id: 'exam_q40_c', text: 'Convencer con argumentos sólidos para generar adhesión.', skillKey: 'negotiation_influence' }
    ]
  },
  {
    id: 'exam_q41',
    category: 'colaborativo',
    text: 'Tu equipo no logra cumplir los objetivos.',
    options: [
      { id: 'exam_q41_a', text: 'Motivar y reorganizar al equipo.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q41_b', text: 'Analizar qué está fallando.', skillKey: 'critical_thinking' },
      { id: 'exam_q41_c', text: 'Ajustar el plan para destrabar el avance.', skillKey: 'problem_solving' }
    ]
  },
  {
    id: 'exam_q42',
    category: 'estrategico',
    text: 'Debes elegir entre una solución rápida y otra más sostenible a largo plazo.',
    options: [
      { id: 'exam_q42_a', text: 'Priorizar la que mejor responda al objetivo inmediato.', skillKey: 'results_orientation' },
      { id: 'exam_q42_b', text: 'Tomar la decisión evaluando riesgos y trade-offs.', skillKey: 'decision_making' },
      { id: 'exam_q42_c', text: 'Escoger la alternativa con mejor proyección futura.', skillKey: 'strategic_vision' }
    ]
  },
  {
    id: 'exam_q43',
    category: 'adaptativo',
    text: 'Surge una oportunidad inesperada.',
    options: [
      { id: 'exam_q43_a', text: 'Tomar iniciativa inmediatamente.', skillKey: 'proactivity_initiative' },
      { id: 'exam_q43_b', text: 'Evaluar beneficios a largo plazo.', skillKey: 'strategic_vision' },
      { id: 'exam_q43_c', text: 'Adaptarte rápido al cambio para aprovecharla.', skillKey: 'adaptability_resilience' }
    ]
  },
  {
    id: 'exam_q44',
    category: 'situacional',
    text: 'Te enfrentas a una tarea repetitiva.',
    options: [
      { id: 'exam_q44_a', text: 'Buscar automatizarla o rediseñarla.', skillKey: 'creativity_innovation' },
      { id: 'exam_q44_b', text: 'Mantener consistencia y precisión.', skillKey: 'attention_to_detail' },
      { id: 'exam_q44_c', text: 'Optimizar el tiempo de ejecución.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q45',
    category: 'colaborativo',
    text: 'Durante una reunión cuestionan públicamente tu propuesta.',
    options: [
      { id: 'exam_q45_a', text: 'Responder con argumentos claros y respetuosos.', skillKey: 'assertive_communication' },
      { id: 'exam_q45_b', text: 'Mantener la compostura mientras gestionas la tensión.', skillKey: 'stress_management' },
      { id: 'exam_q45_c', text: 'Reformular la idea para recuperar apoyo del grupo.', skillKey: 'negotiation_influence' }
    ]
  },
  {
    id: 'exam_q46',
    category: 'situacional',
    text: 'Una métrica clave cae de forma inesperada y nadie sabe por qué.',
    options: [
      { id: 'exam_q46_a', text: 'Investigar la causa raíz antes de intervenir.', skillKey: 'critical_thinking' },
      { id: 'exam_q46_b', text: 'Probar ajustes concretos para recuperar el resultado.', skillKey: 'problem_solving' },
      { id: 'exam_q46_c', text: 'Priorizar la acción con mayor impacto inmediato.', skillKey: 'results_orientation' }
    ]
  },
  {
    id: 'exam_q47',
    category: 'colaborativo',
    text: 'Tienes que coordinar personas con diferentes roles.',
    options: [
      { id: 'exam_q47_a', text: 'Asignar responsabilidades claras.', skillKey: 'teamwork_leadership' },
      { id: 'exam_q47_b', text: 'Comunicar objetivos comunes.', skillKey: 'assertive_communication' },
      { id: 'exam_q47_c', text: 'Organizar tiempos y tareas.', skillKey: 'time_management' }
    ]
  },
  {
    id: 'exam_q48',
    category: 'adaptativo',
    text: 'Se presenta una situación incierta.',
    options: [
      { id: 'exam_q48_a', text: 'Evaluar posibles escenarios.', skillKey: 'critical_thinking' },
      { id: 'exam_q48_b', text: 'Actuar con lo disponible sin bloquearte.', skillKey: 'adaptability_resilience' },
      { id: 'exam_q48_c', text: 'Tomar una decisión clara para avanzar.', skillKey: 'decision_making' }
    ]
  }
]

const skillLabels = Object.fromEntries(EXAM_SKILLS.map(skill => [skill.key, skill.label]))
const EXAM_OPTION_COUNT = EXAM_QUESTION_SEEDS.reduce((total, question) => total + question.options.length, 0)

const shuffle = <T>(items: T[]) => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const canAddQuestion = (
  question: ExamQuestionRecord,
  skillCounts: Record<string, number>,
  maxSkillAppearances: number
) => {
  for (const option of question.options) {
    const nextValue = (skillCounts[option.skillKey] || 0) + 1
    if (nextValue > maxSkillAppearances) {
      return false
    }
  }

  return true
}

const addQuestion = (
  selected: ExamQuestionRecord[],
  question: ExamQuestionRecord,
  skillCounts: Record<string, number>,
  categoryCounts: Record<string, number>
) => {
  selected.push(question)
  categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1

  for (const option of question.options) {
    skillCounts[option.skillKey] = (skillCounts[option.skillKey] || 0) + 1
  }
}

const getRowCount = async (db: DbLike, tableName: string) => {
  const result = await db.execute(`SELECT COUNT(*) as total FROM ${tableName}`)
  return Number(result.rows?.[0]?.total ?? 0)
}

const shouldSyncExamSeed = async (db: DbLike) => {
  const [skillsCount, questionsCount, optionsCount] = await Promise.all([
    getRowCount(db, 'skills'),
    getRowCount(db, 'competency_exam_questions'),
    getRowCount(db, 'competency_exam_options')
  ])

  return (
    skillsCount !== EXAM_SKILLS.length ||
    questionsCount !== EXAM_QUESTION_SEEDS.length ||
    optionsCount !== EXAM_OPTION_COUNT
  )
}

export interface ExamAttemptSummary {
  profile_label: string
  confirmed_skills: Array<{
    key: string
    label: string
    score: number
  }>
  completed_at: string
}

export const ensureCompetencyExamSeed = async (db: DbLike) => {
  if (globalForExamSeed.__competencyExamSeedPromise) {
    return globalForExamSeed.__competencyExamSeedPromise
  }

  globalForExamSeed.__competencyExamSeedPromise = (async () => {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS skills (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS competency_exam_questions (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        category TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS competency_exam_options (
        id TEXT PRIMARY KEY,
        question_id TEXT NOT NULL,
        order_index INTEGER,
        text TEXT NOT NULL,
        skill_key TEXT NOT NULL,
        score_value INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES competency_exam_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_key) REFERENCES skills(key),
        UNIQUE (question_id, order_index)
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS competency_exam_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        profile_label TEXT,
        total_questions INTEGER NOT NULL DEFAULT 0,
        answers_count INTEGER NOT NULL DEFAULT 0,
        scores_json TEXT NOT NULL DEFAULT '{}',
        confirmed_skills_json TEXT NOT NULL DEFAULT '[]',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    await db.execute(`
      CREATE TABLE IF NOT EXISTS competency_exam_answers (
        id TEXT PRIMARY KEY,
        attempt_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        option_id TEXT NOT NULL,
        skill_key TEXT NOT NULL,
        score_value INTEGER NOT NULL DEFAULT 1,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attempt_id) REFERENCES competency_exam_attempts(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES competency_exam_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (option_id) REFERENCES competency_exam_options(id) ON DELETE CASCADE,
        FOREIGN KEY (skill_key) REFERENCES skills(key),
        UNIQUE (attempt_id, question_id)
      )
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comp_exam_attempts_user
      ON competency_exam_attempts(user_id, created_at DESC)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comp_exam_answers_attempt
      ON competency_exam_answers(attempt_id)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comp_exam_options_question
      ON competency_exam_options(question_id)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comp_exam_questions_category
      ON competency_exam_questions(category)
    `)

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_comp_exam_options_skill
      ON competency_exam_options(skill_key)
    `)

    if (!(await shouldSyncExamSeed(db))) {
      return
    }

    for (const skill of EXAM_SKILLS) {
      await db.execute({
        sql: `
          INSERT INTO skills (key, label)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET label = excluded.label
        `,
        args: [skill.key, skill.label]
      })
    }

    for (const question of EXAM_QUESTION_SEEDS) {
      await db.execute({
        sql: `
          INSERT INTO competency_exam_questions (id, text, category, is_active)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(id) DO UPDATE SET
            text = excluded.text,
            category = excluded.category,
            is_active = 1
        `,
        args: [question.id, question.text, question.category]
      })

      for (const [index, option] of question.options.entries()) {
        await db.execute({
          sql: `
            INSERT INTO competency_exam_options
            (id, question_id, order_index, text, skill_key, score_value)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              question_id = excluded.question_id,
              order_index = excluded.order_index,
              text = excluded.text,
              skill_key = excluded.skill_key,
              score_value = excluded.score_value
          `,
          args: [
            option.id,
            question.id,
            index,
            option.text,
            option.skillKey,
            option.scoreValue || 1
          ]
        })
      }
    }

    globalForExamSeed.__competencyExamQuestionPoolPromise = undefined
  })().catch((error) => {
    globalForExamSeed.__competencyExamSeedPromise = undefined
    throw error
  })

  return globalForExamSeed.__competencyExamSeedPromise
}

export const loadExamQuestionPool = async (db: DbLike) => {
  if (globalForExamSeed.__competencyExamQuestionPoolPromise) {
    return globalForExamSeed.__competencyExamQuestionPoolPromise
  }

  globalForExamSeed.__competencyExamQuestionPoolPromise = (async () => {
    await ensureCompetencyExamSeed(db)

    const questionResult = await db.execute({
      sql: `
        SELECT id, text, category
        FROM competency_exam_questions
        WHERE is_active = 1
      `
    })

    const optionResult = await db.execute({
      sql: `
        SELECT id, question_id, order_index, text, skill_key, score_value
        FROM competency_exam_options
        ORDER BY question_id ASC, order_index ASC, created_at ASC
      `
    })

    const questionsMap = new Map<string, ExamQuestionRecord>()

    for (const row of questionResult.rows as any[]) {
      questionsMap.set(String(row.id), {
        id: String(row.id),
        text: String(row.text),
        category: String(row.category),
        options: []
      })
    }

    for (const row of optionResult.rows as any[]) {
      const question = questionsMap.get(String(row.question_id))
      if (!question) continue

      question.options.push({
        id: String(row.id),
        text: String(row.text),
        skillKey: String(row.skill_key),
        scoreValue: Number(row.score_value ?? 1),
        orderIndex: Number(row.order_index ?? 0)
      })
    }

    return Array.from(questionsMap.values())
      .filter(question => question.options.length >= 2)
      .map(question => ({
        ...question,
        options: question.options.sort((a, b) => a.orderIndex - b.orderIndex)
      }))
  })().catch((error) => {
    globalForExamSeed.__competencyExamQuestionPoolPromise = undefined
    throw error
  })

  return globalForExamSeed.__competencyExamQuestionPoolPromise
}

export const getLatestExamAttempt = async (db: DbLike, userId: string): Promise<ExamAttemptSummary | null> => {
  const result = await db.execute({
    sql: `
      SELECT profile_label, confirmed_skills_json, completed_at, created_at
      FROM competency_exam_attempts
      WHERE user_id = ?
      ORDER BY completed_at DESC, created_at DESC
      LIMIT 1
    `,
    args: [userId]
  })

  const row = result.rows?.[0] as any
  if (!row) {
    return null
  }

  return {
    profile_label: String(row.profile_label || 'Perfil Profesional Versatil'),
    confirmed_skills: (() => {
      try {
        const parsed = JSON.parse(String(row.confirmed_skills_json || '[]'))
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })(),
    completed_at: String(row.completed_at || row.created_at || '')
  }
}

export const buildExamQuestionSet = (
  questionPool: ExamQuestionRecord[],
  totalQuestions = EXAM_QUESTION_COUNT
) => {
  const grouped = new Map<string, ExamQuestionRecord[]>()

  for (const category of CATEGORY_ORDER) {
    grouped.set(category, [])
  }

  for (const question of questionPool) {
    const list = grouped.get(question.category) || []
    list.push(question)
    grouped.set(question.category, list)
  }

  const selected: ExamQuestionRecord[] = []
  const selectedIds = new Set<string>()
  const skillCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}
  const categories = shuffle(Array.from(grouped.keys()).filter(category => (grouped.get(category) || []).length > 0))
  const categoryTarget = Math.max(1, Math.floor(totalQuestions / Math.max(categories.length, 1)))

  for (const category of categories) {
    const candidates = shuffle(grouped.get(category) || [])
    for (const question of candidates) {
      if (selected.length >= totalQuestions) break
      if ((categoryCounts[category] || 0) >= categoryTarget) break
      if (selectedIds.has(question.id)) continue
      if (!canAddQuestion(question, skillCounts, MAX_SKILL_APPEARANCES)) continue

      addQuestion(selected, question, skillCounts, categoryCounts)
      selectedIds.add(question.id)
    }
  }

  const remaining = shuffle(questionPool.filter(question => !selectedIds.has(question.id)))

  for (const limit of [MAX_SKILL_APPEARANCES, MAX_SKILL_APPEARANCES + 1, MAX_SKILL_APPEARANCES + 2]) {
    for (const question of remaining) {
      if (selected.length >= totalQuestions) break
      if (selectedIds.has(question.id)) continue
      if (!canAddQuestion(question, skillCounts, limit)) continue

      addQuestion(selected, question, skillCounts, categoryCounts)
      selectedIds.add(question.id)
    }
  }

  for (const question of remaining) {
    if (selected.length >= totalQuestions) break
    if (selectedIds.has(question.id)) continue

    addQuestion(selected, question, skillCounts, categoryCounts)
    selectedIds.add(question.id)
  }

  return shuffle(selected.slice(0, totalQuestions)).map(question => ({
    id: question.id,
    category: question.category,
    text: question.text,
    options: shuffle(
      question.options.map(option => ({
        id: option.id,
        text: option.text
      }))
    )
  }))
}

const buildProfileLabel = (skillKeys: string[]) => {
  if (skillKeys.includes('critical_thinking') && skillKeys.includes('strategic_vision')) {
    return 'Perfil Estratégico Analítico'
  }

  if (skillKeys.includes('teamwork_leadership') && skillKeys.includes('assertive_communication')) {
    return 'Perfil Líder Colaborativo'
  }

  if (skillKeys.includes('results_orientation') && skillKeys.includes('proactivity_initiative')) {
    return 'Perfil Ejecutor de Alto Impacto'
  }

  if (skillKeys.includes('creativity_innovation')) {
    return 'Perfil Innovador Adaptativo'
  }

  return 'Perfil Profesional Versátil'
}

export const evaluateExamAnswers = (
  questionPool: ExamQuestionRecord[],
  answers: ExamAnswerInput[]
) => {
  const questionMap = new Map(questionPool.map(question => [question.id, question]))
  const normalizedAnswers: Array<{
    questionId: string
    optionId: string
    skillKey: string
    scoreValue: number
  }> = []
  const answeredQuestionIds = new Set<string>()

  for (const answer of answers) {
    const questionId = String(answer.question_id || answer.questionId || '')
    const optionId = String(answer.option_id || answer.optionId || '')

    if (!questionId || !optionId || answeredQuestionIds.has(questionId)) {
      continue
    }

    const question = questionMap.get(questionId)
    if (!question) {
      continue
    }

    const option = question.options.find(item => item.id === optionId)
    if (!option) {
      continue
    }

    answeredQuestionIds.add(questionId)
    normalizedAnswers.push({
      questionId,
      optionId,
      skillKey: option.skillKey,
      scoreValue: option.scoreValue
    })
  }

  const scores: Record<string, number> = {}

  for (const answer of normalizedAnswers) {
    scores[answer.skillKey] = (scores[answer.skillKey] || 0) + answer.scoreValue
  }

  const sortedSkills = Object.entries(scores)
    .map(([key, score]) => ({
      key,
      label: skillLabels[key] || key,
      score
    }))
    .sort((a, b) => b.score - a.score)

  const topScore = sortedSkills[0]?.score ?? 0
  const threshold = Math.max(topScore - 2, 3)
  const confirmedSkills = sortedSkills
    .filter(skill => skill.score >= threshold)
    .slice(0, 6)
  const profileLabel = buildProfileLabel(confirmedSkills.map(skill => skill.key))

  return {
    answers: normalizedAnswers,
    scores,
    confirmedSkills,
    profileLabel
  }
}
