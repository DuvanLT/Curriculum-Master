export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const db = useDb()

  await ensureSidebarTourColumn()

  const result = await db.execute({
    sql: 'SELECT sidebar_tour_completed_at FROM users WHERE id = ?',
    args: [session.user.id]
  })

  const user = result.rows[0]

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return {
    completed: Boolean(user.sidebar_tour_completed_at),
    completedAt: user.sidebar_tour_completed_at || null
  }
})
