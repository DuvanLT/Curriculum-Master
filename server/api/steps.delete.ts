export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const { id } = body
  const db = useDb()

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Step ID is required' })
  }

  await db.execute({
    sql: 'DELETE FROM next_steps WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })

  return { success: true }
})
