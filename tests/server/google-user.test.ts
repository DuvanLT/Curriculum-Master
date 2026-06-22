import { describe, it, expect } from 'vitest'
import { buildSessionUser, resolveGoogleUser } from '../../server/utils/google-user'

describe('buildSessionUser', () => {
  it('mapea un registro de DB a la forma de sesión', () => {
    const record = {
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      is_verified: 1,
      preferred_locale: 'en',
      subscription_name: 'free_trial',
      last_payment_at: null,
      extra_col: 'ignored',
    }
    expect(buildSessionUser(record)).toEqual({
      id: 'u1',
      email: 'a@b.com',
      name: 'Ana',
      is_verified: 1,
      preferred_locale: 'en',
      subscription_name: 'free_trial',
      last_payment_at: null,
    })
  })

  it('aplica defaults cuando faltan campos opcionales', () => {
    const record = { id: 'u2', email: 'c@d.com', name: null, is_verified: 0 }
    expect(buildSessionUser(record)).toEqual({
      id: 'u2',
      email: 'c@d.com',
      name: null,
      is_verified: 0,
      preferred_locale: 'es',
      subscription_name: null,
      last_payment_at: null,
    })
  })
})

// Mock mínimo de cliente libsql: registra SQL ejecutado y responde SELECT.
function makeDb(existingRow: any | null) {
  const calls: { sql: string; args: any[] }[] = []
  return {
    calls,
    async execute({ sql, args }: { sql: string; args: any[] }) {
      calls.push({ sql, args })
      if (/^SELECT/i.test(sql.trim())) {
        return { rows: existingRow ? [existingRow] : [] }
      }
      return { rows: [] }
    },
  }
}

const profile = { sub: 'g-123', email: 'New@Mail.com', name: 'Neo', email_verified: true }

describe('resolveGoogleUser', () => {
  it('crea un usuario nuevo verificado con free_trial cuando el email no existe', async () => {
    const db = makeDb(null)
    const { record, isNew } = await resolveGoogleUser(db as any, profile, 'en')

    expect(isNew).toBe(true)
    expect(record.email).toBe('new@mail.com') // normalizado a minúsculas
    expect(record.is_verified).toBe(1)
    expect(record.subscription_name).toBe('free_trial')
    expect(record.preferred_locale).toBe('en')
    expect(record.auth_provider).toBe('google')
    expect(record.google_sub).toBe('g-123')

    const insert = db.calls.find((c) => /INSERT INTO users/i.test(c.sql))
    expect(insert).toBeTruthy()
    // el password insertado no es null/vacío (placeholder hasheado)
    const insertedPassword = insert!.args[3]
    expect(typeof insertedPassword).toBe('string')
    expect(insertedPassword.length).toBeGreaterThan(0)
  })

  it('vincula al usuario existente conservando su suscripción y verificándolo', async () => {
    const existing = {
      id: 'u-existing',
      email: 'new@mail.com',
      name: 'Old Name',
      is_verified: 0,
      preferred_locale: 'es',
      subscription_name: 'pro',
      last_payment_at: '2026-01-01',
      google_sub: null,
    }
    const db = makeDb(existing)
    const { record, isNew } = await resolveGoogleUser(db as any, profile, 'en')

    expect(isNew).toBe(false)
    expect(record.id).toBe('u-existing')
    expect(record.subscription_name).toBe('pro') // se conserva
    expect(record.is_verified).toBe(1) // se verifica al vincular

    const update = db.calls.find((c) => /UPDATE users SET/i.test(c.sql))
    expect(update).toBeTruthy()
    expect(update!.sql).toMatch(/google_sub/)
  })

  it('no fuerza is_verified=1 si Google reporta email no verificado', async () => {
    const db = makeDb(null)
    const { record } = await resolveGoogleUser(
      db as any,
      { ...profile, email_verified: false },
      'es',
    )
    expect(record.is_verified).toBe(0)
  })
})
