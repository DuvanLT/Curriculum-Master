export function convert(amountCop: number, rate: number): number {
  if (!Number.isFinite(amountCop) || amountCop < 0) {
    throw new Error('Monto inválido')
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Tasa inválida')
  }
  return amountCop * rate
}
