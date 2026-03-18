import { createClient } from '@libsql/client'

export const useDb = () => {
  const config = useRuntimeConfig()
  
  if (!config.tursoUrl || !config.tursoToken) {
    throw new Error('Database configuration missing. Please check your .env file.')
  }

  const client = createClient({
    url: config.tursoUrl,
    authToken: config.tursoToken
  })

  return client
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
    { name: 'resumen', type: 'TEXT' },
    { name: 'telefono', type: 'TEXT' },
    { name: 'linkedin', type: 'TEXT' },
    { name: 'github', type: 'TEXT' },
    { name: 'web', type: 'TEXT' },
    { name: 'educacion', type: 'TEXT' },
    { name: 'years', type: 'TEXT' },
    { name: 'is_verified', type: 'INTEGER DEFAULT 0' },
    { name: 'verification_code', type: 'TEXT' }
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
}
