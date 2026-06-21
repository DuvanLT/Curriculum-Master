import { describe, it, expect } from 'vitest'
import { convert } from '#shared/currency/conversion'

describe('convert', () => {
  it('aplica la fórmula cantidadCOP * rate', () => {
    expect(convert(100000, 0.000289)).toBeCloseTo(28.9, 5)
    expect(convert(0, 0.000289)).toBe(0)
  })
  it('lanza con monto inválido (negativo o NaN)', () => {
    expect(() => convert(-1, 0.000289)).toThrow()
    expect(() => convert(Number.NaN, 0.000289)).toThrow()
  })
  it('lanza con tasa inválida', () => {
    expect(() => convert(1000, -1)).toThrow()
    expect(() => convert(1000, Number.NaN)).toThrow()
  })
})
