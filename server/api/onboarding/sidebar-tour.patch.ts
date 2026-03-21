export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDb()

  await ensureSidebarTourColumn()

  await db.execute({
    sql: `
      UPDATE users
      SET sidebar_tour_completed_at = COALESCE(sidebar_tour_completed_at, CURRENT_TIMESTAMP)
      WHERE id = ?
    `,
    args: [session.user.id]
  })

  const result = await db.execute({
    sql: 'SELECT sidebar_tour_completed_at FROM users WHERE id = ?',
    args: [session.user.id]
  })

  return {
    success: true,
    completed: true,
    completedAt: result.rows[0]?.sidebar_tour_completed_at || null
  }
})
