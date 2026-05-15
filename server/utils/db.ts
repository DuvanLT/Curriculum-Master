import { createClient } from '@libsql/client'

// ─── Singleton DB client ───
let cachedClient: ReturnType<typeof createClient> | null = null

export const useDb = () => {
  if (cachedClient) return cachedClient

  const config = useRuntimeConfig()
  
  if (!config.tursoUrl || !config.tursoToken) {
    throw new Error('Database configuration missing. Please check your .env file.')
  }

  cachedClient = createClient({
    url: config.tursoUrl,
    authToken: config.tursoToken
  })

  return cachedClient
}

// ─── Column migration whitelist ───
const ALLOWED_COLUMN_NAMES = new Set([
  'email_profile', 'titulo', 'ubicacion', 'resumen', 'telefono',
  'linkedin', 'github', 'web', 'educacion', 'years', 'idiomas',
  'sidebar_tour_completed_at', 'is_verified', 'verification_code',
  'preferred_locale', 'subscription_name', 'last_payment_at',
  'lemon_squeezy_customer_id', 'lemon_squeezy_order_id'
])

async function ensureUserColumn(db: ReturnType<typeof useDb>, name: string, type: string) {
  if (!ALLOWED_COLUMN_NAMES.has(name)) {
    console.warn(`Skipping unknown column migration: ${name}`)
    return
  }

  const result = await db.execute('PRAGMA table_info(users)')
  const columns = result.rows
    .map((row: any) => String(row.name || row.column_name || '').trim())
    .filter(Boolean)

  if (columns.includes(name)) {
    return
  }

  await db.execute(`ALTER TABLE users ADD COLUMN ${name} ${type}`)
}

const globalForOnboardingSchema = globalThis as typeof globalThis & {
  __sidebarTourColumnPromise?: Promise<void>
}

export const ensureSidebarTourColumn = async () => {
  if (!globalForOnboardingSchema.__sidebarTourColumnPromise) {
    const db = useDb()
    globalForOnboardingSchema.__sidebarTourColumnPromise = ensureUserColumn(db, 'sidebar_tour_completed_at', 'DATETIME')
      .catch((error) => {
        globalForOnboardingSchema.__sidebarTourColumnPromise = undefined
        throw error
      })
  }

  return globalForOnboardingSchema.__sidebarTourColumnPromise
}

export const initDb = async () => {
  const db = useDb()
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      is_verified INTEGER DEFAULT 0,
      verification_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add missing columns if they don't exist (Simple migration)
  const columns = [
    { name: 'email_profile', type: 'TEXT' },
    { name: 'titulo', type: 'TEXT' },
    { name: 'ubicacion', type: 'TEXT' },
    { name: 'resumen', type: 'TEXT' },
    { name: 'telefono', type: 'TEXT' },
    { name: 'linkedin', type: 'TEXT' },
    { name: 'github', type: 'TEXT' },
    { name: 'web', type: 'TEXT' },
    { name: 'educacion', type: 'TEXT' },
    { name: 'years', type: 'TEXT' },
    { name: 'idiomas', type: 'TEXT' },
    { name: 'sidebar_tour_completed_at', type: 'DATETIME' },
    { name: 'is_verified', type: 'INTEGER DEFAULT 0' },
    { name: 'verification_code', type: 'TEXT' },
    { name: 'preferred_locale', type: "TEXT DEFAULT 'es'" },
    { name: 'subscription_name', type: "TEXT DEFAULT 'free_trial'" },
    { name: 'last_payment_at', type: 'DATETIME' },
    { name: 'lemon_squeezy_customer_id', type: 'TEXT' },
    { name: 'lemon_squeezy_order_id', type: 'TEXT' }
  ]
  for (const col of columns) {
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`)
    } catch (e: any) {
      // Column might already exist, ignore error
    }
  }



  await db.execute(`
    CREATE TABLE IF NOT EXISTS experiences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      empresa TEXT NOT NULL,
      cargo TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fin TEXT,
      logros TEXT,
      skills TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  try {
    await db.execute('ALTER TABLE experiences ADD COLUMN type TEXT DEFAULT \'work\'')
  } catch (e: any) {
    // Column might already exist, ignore error
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS educations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      titulo TEXT NOT NULL,
      institucion TEXT NOT NULL,
      inicio TEXT,
      fin TEXT,
      descripcion TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS next_steps (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT NOT NULL,
      analysis TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS job_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      jd_text TEXT NOT NULL,
      company TEXT,
      position TEXT,
      score INTEGER,
      analysis_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS generated_cvs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT,
      position TEXT,
      jd_text TEXT,
      cv_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS churn_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lemon_squeezy_order_id TEXT NOT NULL,
      customer_email TEXT,
      total INTEGER,
      currency TEXT,
      status TEXT,
      event_name TEXT,
      payload_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // ─── Indexes for performance ───
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_experiences_user ON experiences(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_educations_user ON educations(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_job_analyses_user ON job_analyses(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_generated_cvs_user ON generated_cvs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_next_steps_user ON next_steps(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_ls_order ON orders(lemon_squeezy_order_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
  ]

  for (const indexSql of indexes) {
    try {
      await db.execute(indexSql)
    } catch (e: any) {
      console.warn('Index creation warning:', e.message)
    }
  }
}
