import { v4 as uuidv4 } from 'uuid'
import { requireVerifiedUserSession } from '../utils/verified-session'

const MAX_STEPS = 40

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const { text } = await readBody(event)
  const db = useDb()

  const stepText = String(text || '').trim()
  if (!stepText || stepText.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Task text is required and must be under 500 characters.' })
  }

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM next_steps WHERE user_id = ?',
    args: [userId]
  })

  const currentCount = Number(countResult.rows?.[0]?.total ?? 0)
  if (currentCount >= MAX_STEPS) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Has alcanzado el maximo de 40 tareas. Resuelve y elimina algunas para continuar.'
    })
  }

  const id = uuidv4()
  await db.execute({
    sql: 'INSERT INTO next_steps (id, user_id, text, completed) VALUES (?, ?, ?, 0)',
    args: [id, userId, text]
  })

  return { id, text, completed: false }
})
