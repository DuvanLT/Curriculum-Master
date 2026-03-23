const PASSWORD_SYMBOL_REGEX = /[!@#$%^&*(),.?":{}|<>]/

export const passwordRequirementsText = 'Minimo 8 caracteres, una mayuscula, un numero y un simbolo especial.'

export function getPasswordValidationError(password: string) {
  if (!password || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = PASSWORD_SYMBOL_REGEX.test(password)

  if (!hasUppercase || !hasNumber || !hasSymbol) {
    return 'La contraseña debe incluir al menos una mayuscula, un numero y un simbolo especial.'
  }

  return ''
}
