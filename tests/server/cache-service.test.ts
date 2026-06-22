import { describe, it, expect } from 'vitest'
import { CacheService } from '../../server/utils/currency/cache'

describe('CacheService', () => {
  it('devuelve el valor dentro del TTL', () => {
    let now = 1000
    const cache = new CacheService<number>(() => now)
    cache.set('k', 42, 5000)
    now = 2000
    expect(cache.get('k')).toBe(42)
  })
  it('expira el valor pasado el TTL', () => {
    let now = 1000
    const cache = new CacheService<number>(() => now)
    cache.set('k', 42, 5000)
    now = 6000 // 1000 + 5000
    expect(cache.get('k')).toBeUndefined()
  })
  it('miss para clave inexistente', () => {
    const cache = new CacheService<number>(() => 0)
    expect(cache.get('nope')).toBeUndefined()
  })
})
