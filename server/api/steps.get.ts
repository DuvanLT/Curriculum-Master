export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const db = useDb()

  const result = await db.execute({
    sql: 'SELECT id, text, completed, created_at FROM next_steps WHERE user_id = ? ORDER BY created_at DESC',
    args: [userId]
  })

  return result.rows.map(row => ({
    ...row,
    completed: Boolean(row.completed)
  }))
})
