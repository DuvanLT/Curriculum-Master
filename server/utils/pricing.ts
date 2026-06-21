export function getBasePrice(config: { boldPaymentAmount?: string | number }): number {
  const n = Number(config.boldPaymentAmount)
  return Number.isFinite(n) && n > 0 ? n : 32500
}

// Aplica % de descuento al precio base; redondea a entero COP. Nunca < 0.
export function applyDiscount(base: number, percent: number): number {
  const pct = Math.min(Math.max(percent, 0), 100)
  return Math.max(0, base - Math.round((base * pct) / 100))
}
