type SendAuthCodeEmailOptions = {
  to: string
  subject: string
  intro: string
  code: string
  name?: string | null
  footer?: string
}

const PASSWORD_SYMBOL_REGEX = /[!@#$%^&*(),.?":{}|<>]/

export function getStrongPasswordError(password: string) {
  if (!password || password.length < 8) {
    return 'La contrasena debe tener al menos 8 caracteres.'
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = PASSWORD_SYMBOL_REGEX.test(password)

  if (!hasUppercase || !hasNumber || !hasSymbol) {
    return 'La contrasena debe incluir al menos una mayuscula, un numero y un simbolo especial.'
  }

  return null
}

export function assertStrongPassword(password: string) {
  const validationError = getStrongPasswordError(password)

  if (validationError) {
    throw createError({
      statusCode: 400,
      statusMessage: validationError
    })
  }
}

export function assertSixDigitCode(code: unknown) {
  const normalizedCode = String(code || '').trim()

  if (!/^\d{6}$/.test(normalizedCode)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El codigo debe tener 6 digitos.'
    })
  }

  return normalizedCode
}

export function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendAuthCodeEmail(options: SendAuthCodeEmailOptions) {
  const config = useRuntimeConfig()

  if (!config.resendApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'No hay un servicio de correo configurado para enviar el codigo.'
    })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(config.resendApiKey)

    await resend.emails.send({
      from: 'no-reply@wikisportco.com',
      to: options.to,
      subject: options.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #f59e0b; text-align: center;">Bring Jobs</h1>
          <p style="font-size: 16px; color: #333;">Hola ${options.name || 'usuario'}.</p>
          <p style="font-size: 16px; color: #333;">${options.intro}</p>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f59e0b;">${options.code}</span>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">${options.footer || 'Si no reconoces esta solicitud, puedes ignorar este correo.'}</p>
        </div>
      `
    })
  } catch (error) {
    console.error('Error sending password reset email:', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'No pudimos enviar el correo con el codigo. Intenta de nuevo.'
    })
  }
}
