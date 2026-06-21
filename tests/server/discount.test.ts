import { describe, it, expect, beforeEach } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { lookupActiveDiscount, getCheckoutDiscountCode } from '../../server/utils/discount'

async function seedDb(): Promise<Client> {
  const db = createClient({ url: ':memory:' })
  await db.execute(`CREATE TABLE discount_codes (
    code TEXT PRIMARY KEY, seller_name TEXT NOT NULL,
    discount_percent INTEGER NOT NULL, active INTEGER DEFAULT 1
  )`)
  await db.execute(`CREATE TABLE checkout_sessions (
    reference TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    discount_code TEXT, amount INTEGER NOT NULL
  )`)
  await db.execute({ sql: 'INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES (?,?,?,?)', args: ['CODTE', 'Prueba', 15, 1] })
  await db.execute({ sql: 'INSERT INTO discount_codes (code, seller_name, discount_percent, active) VALUES (?,?,?,?)', args: ['OFF', 'Inactivo', 20, 0] })
  await db.execute({ sql: 'INSERT INTO checkout_sessions (reference, user_id, discount_code, amount) VALUES (?,?,?,?)', args: ['ref-1', 'u1', 'CODTE', 27625] })
  await db.execute({ sql: 'INSERT INTO checkout_sessions (reference, user_id, discount_code, amount) VALUES (?,?,?,?)', args: ['ref-2', 'u1', null, 32500] })
  return db
}

describe('lookupActiveDiscount', () => {
  let db: Client
  beforeEach(async () => { db = await seedDb() })

  it('devuelve datos + final_amount para un código activo', async () => {
    const r = await lookupActiveDiscount(db as any, 'CODTE', 32500)
    expect(r).toEqual({ code: 'CODTE', seller_name: 'Prueba', discount_percent: 15, final_amount: 27625 })
  })
  it('null para código inactivo', async () => {
    expect(await lookupActiveDiscount(db as any, 'OFF', 32500)).toBeNull()
  })
  it('null para código inexistente', async () => {
    expect(await lookupActiveDiscount(db as any, 'NOPE', 32500)).toBeNull()
  })
})

describe('getCheckoutDiscountCode', () => {
  let db: Client
  beforeEach(async () => { db = await seedDb() })

  it('devuelve el código de la sesión', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-1')).toBe('CODTE')
  })
  it('null cuando la sesión no tiene código', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-2')).toBeNull()
  })
  it('null cuando no existe la referencia', async () => {
    expect(await getCheckoutDiscountCode(db as any, 'ref-x')).toBeNull()
  })
})
