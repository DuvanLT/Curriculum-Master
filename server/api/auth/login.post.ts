import bcrypt from 'bcryptjs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required'
    })
  }

  const db = useDb()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email]
  })

  if (result.rows.length === 0) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  const userRecord = result.rows[0] as any
  const isPasswordCorrect = await bcrypt.compare(password, userRecord.password)

  if (!isPasswordCorrect) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  const user = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name,
    is_verified: userRecord.is_verified
  }

  await setUserSession(event, { user })

  return { user }
})
