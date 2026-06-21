import { applyDiscount } from './pricing'

export interface ValidatedDiscount {
  code: string
  seller_name: string
  discount_percent: number
  final_amount: number
}

interface DbClient {
  execute(stmt: { sql: string; args: any[] }): Promise<{ rows: any[] }>
}

export async function lookupActiveDiscount(
  db: DbClient,
  code: string,
  basePrice: number,
): Promise<ValidatedDiscount | null> {
  const res = await db.execute({
    sql: 'SELECT code, seller_name, discount_percent FROM discount_codes WHERE code = ? AND active = 1',
    args: [code],
  })
  const row = res.rows[0] as any
  if (!row) return null
  const percent = Number(row.discount_percent)
  return {
    code: String(row.code),
    seller_name: String(row.seller_name),
    discount_percent: percent,
    final_amount: applyDiscount(basePrice, percent),
  }
}

export async function getCheckoutDiscountCode(
  db: DbClient,
  reference: string,
): Promise<string | null> {
  const res = await db.execute({
    sql: 'SELECT discount_code FROM checkout_sessions WHERE reference = ?',
    args: [reference],
  })
  const row = res.rows[0] as any
  return row?.discount_code ? String(row.discount_code) : null
}
