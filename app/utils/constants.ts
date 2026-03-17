export const DB_SCHEMA = {
  usuarios: [
    { col: 'id', type: 'INTEGER', notes: 'PK AUTOINCREMENT' },
    { col: 'nombre', type: 'TEXT', notes: 'NOT NULL' },
    { col: 'email', type: 'TEXT', notes: 'UNIQUE NOT NULL' },
    { col: 'titulo_actual', type: 'TEXT', notes: '' },
    { col: 'years_experiencia', type: 'INTEGER', notes: 'DEFAULT 0' },
    { col: 'resumen_bio', type: 'TEXT', notes: '' },
    { col: 'created_at', type: 'DATETIME', notes: 'DEFAULT NOW' },
  ],
  experiencias: [
    { col: 'id', type: 'INTEGER', notes: 'PK AUTOINCREMENT' },
    { col: 'usuario_id', type: 'INTEGER', notes: 'FK → usuarios.id' },
    { col: 'empresa', type: 'TEXT', notes: 'NOT NULL' },
    { col: 'cargo', type: 'TEXT', notes: 'NOT NULL' },
    { col: 'fecha_inicio', type: 'DATE', notes: 'NOT NULL' },
    { col: 'fecha_fin', type: 'DATE', notes: 'NULL = actual' },
    { col: 'descripcion', type: 'TEXT', notes: '' },
    { col: 'logros', type: 'JSON', notes: 'Array logros cuantif.' },
    { col: 'hard_skills', type: 'JSON', notes: 'Array habilidades' },
    { col: 'industria', type: 'TEXT', notes: '' },
  ],
  vacantes: [
    { col: 'id', type: 'INTEGER', notes: 'PK AUTOINCREMENT' },
    { col: 'usuario_id', type: 'INTEGER', notes: 'FK → usuarios.id' },
    { col: 'empresa_oferta', type: 'TEXT', notes: '' },
    { col: 'titulo_puesto', type: 'TEXT', notes: 'NOT NULL' },
    { col: 'descripcion_jd', type: 'TEXT', notes: 'Texto completo JD' },
    { col: 'keywords_extraidas', type: 'JSON', notes: 'Hard skills detectadas' },
    { col: 'score_compatibilidad', type: 'REAL', notes: '0.0 a 100.0' },
    { col: 'keywords_faltantes', type: 'JSON', notes: 'Gap análisis' },
    { col: 'analisis_ia', type: 'TEXT', notes: 'Respuesta LLM completa' },
    { col: 'created_at', type: 'DATETIME', notes: 'DEFAULT NOW' },
  ],
  cvs_generados: [
    { col: 'id', type: 'INTEGER', notes: 'PK AUTOINCREMENT' },
    { col: 'usuario_id', type: 'INTEGER', notes: 'FK → usuarios.id' },
    { col: 'vacante_id', type: 'INTEGER', notes: 'FK → vacantes.id' },
    { col: 'version', type: 'INTEGER', notes: 'DEFAULT 1' },
    { col: 'contenido_md', type: 'TEXT', notes: 'Markdown ATS-safe' },
    { col: 'contenido_json', type: 'JSON', notes: 'Estructura parseable' },
    { col: 'resumen_adaptado', type: 'TEXT', notes: 'Summary para la oferta' },
    { col: 'score_ats', type: 'REAL', notes: 'Estimación ATS score' },
    { col: 'created_at', type: 'DATETIME', notes: 'DEFAULT NOW' },
  ]
};

export const SYSTEM_PROMPTS = {
  analyzer: `Eres ATS-Master AI, un experto en reclutamiento técnico con 15 años de experiencia en sistemas ATS...`,
  cv_generator: `Eres ATS-Master CV Generator. Generas CVs en Markdown optimizados para ATS...`,
  chatbot: `Eres ATS-Master Career Coach, consultor de carrera senior especializado...`
};

export const SKILL_PATTERNS = [
  /\b(react|vue|angular|svelte|next\.?js|nuxt|gatsby)\b/gi,
  /\b(node\.?js|express|fastapi|django|flask|spring|rails|laravel)\b/gi,
  /\b(python|javascript|typescript|java|kotlin|swift|go|rust|c\+\+|php|ruby|scala)\b/gi,
  /\b(aws|azure|gcp|cloud|docker|kubernetes|k8s|terraform|ansible|ci\/cd|devops)\b/gi,
  /\b(sql|postgresql|mysql|mongodb|redis|elasticsearch|cassandra|dynamodb)\b/gi,
  /\b(graphql|rest|api|microservices|grpc|websocket|kafka|rabbitmq)\b/gi,
  /\b(git|github|gitlab|jira|scrum|agile|kanban|tdd|ddd)\b/gi,
  /\b(machine learning|deep learning|nlp|llm|pytorch|tensorflow|scikit|pandas|numpy)\b/gi,
  /\b(figma|sketch|ux|ui|css|html|tailwind|sass|webpack|vite)\b/gi,
  /\b(linux|unix|bash|shell|nginx|apache|ci\/cd|jenkins|github actions)\b/gi,
];
