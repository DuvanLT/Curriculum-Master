import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const { text } = await readBody(event)
  const db = useDb()

  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'Task text is required' })
  }

  const id = uuidv4()
  await db.execute({
    sql: 'INSERT INTO next_steps (id, user_id, text, completed) VALUES (?, ?, ?, 0)',
    args: [id, userId, text]
  })

  return { id, text, completed: false }
})
