interface Entry<T> {
  value: T
  expiresAt: number
}

// Caché genérico con TTL, desacoplado de framework. `now` inyectable para test.
export class CacheService<T> {
  private store = new Map<string, Entry<T>>()
  constructor(private now: () => number = () => Date.now()) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: this.now() + ttlMs })
  }
}
