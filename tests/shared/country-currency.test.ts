import { describe, it, expect } from 'vitest'
import { resolveCurrencyFromCountry } from '#shared/currency/country-currency'

describe('resolveCurrencyFromCountry', () => {
  it('mapea países soportados a su divisa', () => {
    expect(resolveCurrencyFromCountry('US')).toBe('USD')
    expect(resolveCurrencyFromCountry('mx')).toBe('MXN') // case-insensitive
    expect(resolveCurrencyFromCountry('ES')).toBe('EUR')
    expect(resolveCurrencyFromCountry('CL')).toBe('CLP')
  })
  it('null cuando el header/país falta', () => {
    expect(resolveCurrencyFromCountry(undefined)).toBeNull()
    expect(resolveCurrencyFromCountry(null)).toBeNull()
    expect(resolveCurrencyFromCountry('')).toBeNull()
  })
  it('null cuando el país no está soportado', () => {
    expect(resolveCurrencyFromCountry('JP')).toBeNull()
    expect(resolveCurrencyFromCountry('CO')).toBeNull() // base COP, no es destino
  })
})
