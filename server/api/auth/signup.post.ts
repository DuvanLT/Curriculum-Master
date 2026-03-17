import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  const db = useDb()
  
  // Check if user exists
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email]
  })

  if (existingUser.rows.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User already exists'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const id = uuidv4()

  await db.execute({
    sql: 'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
    args: [id, email, hashedPassword, name || null]
  })

  const user = { id, email, name }
  
  // Set session
  await setUserSession(event, { user })

  return { user }
})
