import { describe, it, expect, beforeEach } from 'vitest'
import { createClient, type Client } from '@libsql/client'
import { deleteUserAccount } from '../../server/utils/delete-account'

// Reproduce el esquema relevante en una DB en memoria, con FK enforcement
// activo, para reproducir fielmente el constraint de Turso.
async function seedDb(): Promise<Client> {
  const db = createClient({ url: ':memory:' })
  await db.execute('PRAGMA foreign_keys = ON')

  await db.execute(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT)`)
  // orders: FK a users SIN cascade (NO ACTION) -> reproduce el bug
  await db.execute(`CREATE TABLE orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`)
  // experiences: FK a users CON cascade -> debe limpiarse solo
  await db.execute(`CREATE TABLE experiences (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`)

  await db.execute({ sql: 'INSERT INTO users (id, email) VALUES (?, ?)', args: ['u1', 'a@b.com'] })
  await db.execute({ sql: 'INSERT INTO orders (id, user_id) VALUES (?, ?)', args: ['o1', 'u1'] })
  await db.execute({ sql: 'INSERT INTO orders (id, user_id) VALUES (?, ?)', args: ['o2', 'u1'] })
  await db.execute({ sql: 'INSERT INTO experiences (id, user_id) VALUES (?, ?)', args: ['e1', 'u1'] })
  return db
}

describe('deleteUserAccount', () => {
  let db: Client
  beforeEach(async () => { db = await seedDb() })

  it('elimina al usuario aunque tenga órdenes (no falla por FK)', async () => {
    await expect(deleteUserAccount(db, 'u1')).resolves.not.toThrow()

    const users = await db.execute('SELECT COUNT(*) n FROM users')
    const orders = await db.execute('SELECT COUNT(*) n FROM orders')
    const exps = await db.execute('SELECT COUNT(*) n FROM experiences')
    expect(Number(users.rows[0].n)).toBe(0)
    expect(Number(orders.rows[0].n)).toBe(0)   // orders borradas explícitamente
    expect(Number(exps.rows[0].n)).toBe(0)     // experiences por cascade
  })

  it('no afecta a otros usuarios', async () => {
    await db.execute({ sql: 'INSERT INTO users (id, email) VALUES (?, ?)', args: ['u2', 'c@d.com'] })
    await db.execute({ sql: 'INSERT INTO orders (id, user_id) VALUES (?, ?)', args: ['o3', 'u2'] })

    await deleteUserAccount(db, 'u1')

    const u2 = await db.execute({ sql: 'SELECT COUNT(*) n FROM users WHERE id=?', args: ['u2'] })
    const o3 = await db.execute({ sql: 'SELECT COUNT(*) n FROM orders WHERE user_id=?', args: ['u2'] })
    expect(Number(u2.rows[0].n)).toBe(1)
    expect(Number(o3.rows[0].n)).toBe(1)
  })
})
