declare module '#auth-utils' {
  interface User {
    id: string;
    email: string;
    name?: string;
    is_verified: number;
  }
}

export {}
