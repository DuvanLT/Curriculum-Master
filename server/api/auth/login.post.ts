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

  const userRow = result.rows[0]

  if (!userRow || !(await bcrypt.compare(password, userRow.password as string))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid email or password'
    })
  }

  const user = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name
  }

  await setUserSession(event, { user })

  return { user }
})
