export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const { id, completed } = await readBody(event)
  const db = useDb()

  await db.execute({
    sql: 'UPDATE next_steps SET completed = ? WHERE id = ? AND user_id = ?',
    args: [completed ? 1 : 0, id, userId]
  })

  return { success: true }
})
