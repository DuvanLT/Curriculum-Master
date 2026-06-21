import { describe, it, expect } from 'vitest'
import { getBasePrice, applyDiscount } from '../../server/utils/pricing'

describe('getBasePrice', () => {
  it('usa boldPaymentAmount del config', () => {
    expect(getBasePrice({ boldPaymentAmount: '40000' })).toBe(40000)
    expect(getBasePrice({ boldPaymentAmount: 50000 })).toBe(50000)
  })
  it('cae a 32500 si falta o es inválido', () => {
    expect(getBasePrice({})).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: '' })).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: '0' })).toBe(32500)
    expect(getBasePrice({ boldPaymentAmount: 'abc' })).toBe(32500)
  })
})

describe('applyDiscount', () => {
  it('aplica el porcentaje y redondea a entero', () => {
    expect(applyDiscount(32500, 10)).toBe(29250)
    expect(applyDiscount(32500, 15)).toBe(27625)
  })
  it('0% deja el precio igual', () => {
    expect(applyDiscount(32500, 0)).toBe(32500)
  })
  it('acota el porcentaje a 0..100 y nunca devuelve negativo', () => {
    expect(applyDiscount(32500, 100)).toBe(0)
    expect(applyDiscount(32500, 150)).toBe(0)
    expect(applyDiscount(32500, -10)).toBe(32500)
  })
})
