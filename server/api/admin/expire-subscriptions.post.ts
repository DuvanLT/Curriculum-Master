export default defineEventHandler(async (event) => {
  const db = useDb()

  const result = await db.execute(`
    UPDATE users
    SET subscription_name = 'free_trial'
    WHERE subscription_name = 'pro'
      AND last_payment_at < datetime('now', '-30 days')
  `)

  const affected = Number(result.rowsAffected ?? 0)
  console.log(`[Admin] expire-subscriptions: ${affected} user(s) downgraded to free_trial`)

  return { ok: true, downgraded: affected }
})
