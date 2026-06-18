import { describe, it, expect } from 'vitest'
import { buildSessionUser } from '../../server/utils/google-user'

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
