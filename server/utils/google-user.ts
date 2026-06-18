export interface SessionUser {
  id: string
  email: string
  name: string | null
  is_verified: number
  preferred_locale: string
  subscription_name: string | null
  last_payment_at: string | null
}

export function buildSessionUser(record: any): SessionUser {
  return {
    id: record.id,
    email: record.email,
    name: record.name ?? null,
    is_verified: Number(record.is_verified || 0),
    preferred_locale: record.preferred_locale || 'es',
    subscription_name: record.subscription_name || null,
    last_payment_at: record.last_payment_at || null,
  }
}
