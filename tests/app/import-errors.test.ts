import { describe, it, expect } from 'vitest'
import { isCvNotReadable } from '../../app/utils/import-errors'

describe('isCvNotReadable', () => {
  it('true cuando el código está bajo err.data.data.code (forma Nitro)', () => {
    const err = { statusCode: 422, data: { statusCode: 422, message: 'x', data: { code: 'CV_NOT_READABLE' } } }
    expect(isCvNotReadable(err)).toBe(true)
  })

  it('true cuando el código está bajo err.data.code (forma alterna)', () => {
    const err = { statusCode: 422, data: { code: 'CV_NOT_READABLE' } }
    expect(isCvNotReadable(err)).toBe(true)
  })

  it('false para otros errores', () => {
    expect(isCvNotReadable({ statusCode: 500, data: { message: 'boom' } })).toBe(false)
    expect(isCvNotReadable({ statusCode: 403, data: { code: 'QUOTA' } })).toBe(false)
    expect(isCvNotReadable(null)).toBe(false)
    expect(isCvNotReadable(undefined)).toBe(false)
  })
})
