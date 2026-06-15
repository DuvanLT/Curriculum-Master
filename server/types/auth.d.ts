export type SubscriptionPlan = 'free_trial' | 'pro';

declare module '#auth-utils' {
  interface User {
    id: string;
    email: string;
    name?: string;
    is_verified: number;
    preferred_locale?: string | null;
    subscription_name?: SubscriptionPlan | string | null;
    last_payment_at?: string | null;
    from_trial?: boolean;
  }
}

export {}
