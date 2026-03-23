import bcrypt from 'bcryptjs'
import {
  assertSixDigitCode,
  assertStrongPassword,
  generateSixDigitCode,
  sendAuthCodeEmail
} from '../../utils/password-security'

const PASSWORD_RESET_CODE_WINDOW_MS = 15 * 60 * 1000
const PASSWORD_RESET_VERIFIED_WINDOW_MS = 10 * 60 * 1000

type PasswordResetState = {
  code: string | null
  expiresAt: string | null
  verifiedAt: string | null
  userId: string | null
  email: string | null
}

function getPasswordResetState(session: any): PasswordResetState {
  const state = session?.secure?.passwordReset

  return {
    code: typeof state?.code === 'string' ? state.code : null,
    expiresAt: typeof state?.expiresAt === 'string' ? state.expiresAt : null,
    verifiedAt: typeof state?.verifiedAt === 'string' ? state.verifiedAt : null,
    userId: typeof state?.userId === 'string' ? state.userId : null,
    email: typeof state?.email === 'string' ? state.email : null
  }
}

async function savePasswordResetState(event: any, session: any, state: PasswordResetState) {
  await setUserSession(event, {
    user: session.user || null,
    secure: {
      passwordReset: state
    }
  } as any)
}

function isIsoDateExpired(value: string | null) {
  if (!value) {
    return true
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) || date.getTime() < Date.now()
}

function isVerificationStillValid(value: string | null) {
  if (!value) {
    return false
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return false
  }

  return Date.now() - date.getTime() <= PASSWORD_RESET_VERIFIED_WINDOW_MS
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event) as any
  const body = await readBody(event)
  const action = String(body?.action || '')

  if (action === 'request-code') {
    const email = String(body?.email || '').trim().toLowerCase()
    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El correo electrónico es requerido.'
      })
    }

    const db = useDb()
    const userResult = await db.execute({
      sql: 'SELECT id, name FROM users WHERE email = ?',
      args: [email]
    })

    const user = userResult.rows[0] as any
    if (!user) {
      // For security reasons, we could pretend success, but given the app context, 
      // let's be explicit or follow the existing pattern.
      throw createError({
        statusCode: 404,
        statusMessage: 'No encontramos una cuenta con ese correo electrónico.'
      })
    }

    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_WINDOW_MS).toISOString()

    await savePasswordResetState(event, session, {
      code,
      expiresAt,
      verifiedAt: null,
      userId: user.id,
      email: email
    })

    await sendAuthCodeEmail({
      to: email,
      name: user.name,
      subject: 'Código para recuperar tu contraseña - Bring Jobs',
      intro: 'Has solicitado recuperar tu contraseña. Usa este código de 6 dígitos para continuar.',
      code,
      footer: 'Si no solicitaste recuperar tu contraseña, ignora este correo. El código vence en 15 minutos.'
    })

    return {
      success: true,
      step: 'code-sent',
      expiresAt
    }
  }

  const state = getPasswordResetState(session)

  if (!state.code || !state.expiresAt || !state.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero solicita un código de recuperación.'
    })
  }

  if (isIsoDateExpired(state.expiresAt)) {
    await savePasswordResetState(event, session, {
      code: null,
      expiresAt: null,
      verifiedAt: null,
      userId: null,
      email: null
    })

    throw createError({
      statusCode: 400,
      statusMessage: 'El código ya venció. Solicita uno nuevo.'
    })
  }

  if (action === 'verify-code') {
    const code = assertSixDigitCode(body?.code)

    if (state.code !== code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Código de recuperación incorrecto.'
      })
    }

    await savePasswordResetState(event, session, {
      ...state,
      verifiedAt: new Date().toISOString()
    })

    return {
      success: true,
      step: 'verified'
    }
  }

  if (action === 'update-password') {
    const password = String(body?.password || '')
    const confirmPassword = String(body?.confirmPassword || '')

    if (!password || !confirmPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Debes completar y confirmar la nueva contraseña.'
      })
    }

    if (password !== confirmPassword) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Las contraseñas no coinciden.'
      })
    }

    assertStrongPassword(password)

    if (!isVerificationStillValid(state.verifiedAt)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Primero valida el código de recuperación.'
      })
    }

    const db = useDb()
    const userResult = await db.execute({
      sql: 'SELECT password FROM users WHERE id = ?',
      args: [state.userId]
    })

    const user = userResult.rows[0] as any
    if (user && await bcrypt.compare(password, user.password)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'La nueva contraseña no puede ser igual a la anterior.'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, state.userId]
    })

    // Clear reset state after success
    await savePasswordResetState(event, session, {
      code: null,
      expiresAt: null,
      verifiedAt: null,
      userId: null,
      email: null
    })

    return {
      success: true,
      step: 'completed'
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Acción no válida.'
  })
})
