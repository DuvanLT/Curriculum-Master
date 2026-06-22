// Mapea un código de error de auth (data.code del servidor) a una clave i18n.
// Cae a 'auth.errors.generic' si no hay código o la clave no existe.
export function authErrorKey(
  code: string | null | undefined,
  hasKey: (key: string) => boolean,
): string {
  if (code) {
    const key = `auth.errors.${code}`
    if (hasKey(key)) return key
  }
  return 'auth.errors.generic'
}
