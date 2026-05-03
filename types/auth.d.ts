declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name?: string
    is_verified: number
    preferred_locale?: string
  }
}

export {}
