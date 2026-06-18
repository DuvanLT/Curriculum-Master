import { describe, it, expect } from 'vitest'
import { cvNotReadableError, CV_NOT_READABLE } from '../../server/utils/cv-import'

describe('cvNotReadableError', () => {
  it('produce un error 422 con el código CV_NOT_READABLE', () => {
    const err: any = cvNotReadableError('PDF ilegible')
    expect(err.statusCode).toBe(422)
    expect(err.message).toBe('PDF ilegible')
    expect(err.data).toEqual({ code: CV_NOT_READABLE })
  })

  it('exporta la constante con el valor de contrato', () => {
    expect(CV_NOT_READABLE).toBe('CV_NOT_READABLE')
  })
})
