export const FREE_TRIAL_LIMITS = {
  MAX_CVS: 3,
  MAX_ANALYSES: 5
}

export function isProUser(subscriptionName?: string | null): boolean {
  return subscriptionName === 'pro'
}

export function isFreeTrialUser(subscriptionName?: string | null): boolean {
  return subscriptionName === 'free_trial' || !subscriptionName
}
