import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  is_verified: number
  preferred_locale: string
  subscription_name: string | null
  last_payment_at: string | null
}

export function buildSessionUser(record: any): SessionUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? null,
    is_verified: Number(record.is_verified || 0),
    preferred_locale: record.preferred_locale || 'es',
    subscription_name: record.subscription_name || null,
    last_payment_at: record.last_payment_at || null,
  }
}

export interface GoogleProfile {
  sub: string
  email: string
  name?: string | null
  email_verified?: boolean
}

interface DbClient {
  execute(stmt: { sql: string; args: any[] }): Promise<{ rows: any[] }>
}

export async function resolveGoogleUser(
  db: DbClient,
  profile: GoogleProfile,
  locale: string,
): Promise<{ record: any; isNew: boolean }> {
  const email = (profile.email || '').toLowerCase()
  const verified = profile.email_verified === false ? 0 : 1

  const existing = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  })

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as any
    const nextVerified = verified === 1 ? 1 : Number(row.is_verified || 0)
    await db.execute({
      sql: 'UPDATE users SET google_sub = ?, is_verified = ? WHERE id = ?',
      args: [profile.sub, nextVerified, row.id],
    })
    return { record: { ...row, google_sub: profile.sub, is_verified: nextVerified }, isNew: false }
  }

  const id = uuidv4()
  // Placeholder inservible: el usuario nunca lo conoce; puede usar "recuperar contraseña".
  const placeholderPassword = await bcrypt.hash(uuidv4(), 10)
  const preferred = ['es', 'en'].includes(locale) ? locale : 'es'

  await db.execute({
    sql: `INSERT INTO users
            (id, email, email_profile, password, name, is_verified, preferred_locale, subscription_name, auth_provider, google_sub)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, email, null, placeholderPassword, profile.name || null, verified, preferred, 'free_trial', 'google', profile.sub],
  })

  return {
    record: {
      id,
      email,
      name: profile.name || null,
      is_verified: verified,
      preferred_locale: preferred,
      subscription_name: 'free_trial',
      last_payment_at: null,
      auth_provider: 'google',
      google_sub: profile.sub,
    },
    isNew: true,
  }
}
