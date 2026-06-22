import { describe, it, expect } from 'vitest'
import { authErrorKey } from '../../app/utils/auth-errors'

// hasKey simula i18n.te(): existen las claves de auth.errors.*
const existing = new Set([
  'auth.errors.MISSING_CREDENTIALS',
  'auth.errors.INVALID_CREDENTIALS',
  'auth.errors.USER_EXISTS',
  'auth.errors.generic',
])
const hasKey = (k: string) => existing.has(k)

describe('authErrorKey', () => {
  it('devuelve la clave del código cuando existe', () => {
    expect(authErrorKey('INVALID_CREDENTIALS', hasKey)).toBe('auth.errors.INVALID_CREDENTIALS')
    expect(authErrorKey('USER_EXISTS', hasKey)).toBe('auth.errors.USER_EXISTS')
  })
  it('cae a generic cuando el código no tiene clave', () => {
    expect(authErrorKey('UNKNOWN_CODE', hasKey)).toBe('auth.errors.generic')
  })
  it('cae a generic cuando no hay código', () => {
    expect(authErrorKey(null, hasKey)).toBe('auth.errors.generic')
    expect(authErrorKey(undefined, hasKey)).toBe('auth.errors.generic')
  })
})
