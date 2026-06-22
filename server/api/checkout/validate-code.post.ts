import { requireVerifiedUserSession } from '../../utils/verified-session'
import { getBasePrice } from '../../utils/pricing'
import { lookupActiveDiscount } from '../../utils/discount'

export default defineEventHandler(async (event) => {
  await requireVerifiedUserSession(event)

  const body = await readBody(event).catch(() => ({}))
  const code = String(body?.code || '').trim().toUpperCase()
  if (!code) {
    return { valid: false }
  }

  const db = useDb()
  const basePrice = getBasePrice(useRuntimeConfig())
  const discount = await lookupActiveDiscount(db, code, basePrice)

  if (!discount) {
    return { valid: false }
  }

  return {
    valid: true,
    code: discount.code,
    seller_name: discount.seller_name,
    discount_percent: discount.discount_percent,
    final_amount: discount.final_amount,
  }
})
