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
}

function getPasswordResetState(session: any): PasswordResetState {
  const state = session?.secure?.passwordReset

  return {
    code: typeof state?.code === 'string' ? state.code : null,
    expiresAt: typeof state?.expiresAt === 'string' ? state.expiresAt : null,
    verifiedAt: typeof state?.verifiedAt === 'string' ? state.verifiedAt : null
  }
}

async function savePasswordResetState(event: any, session: any, state: PasswordResetState) {
  await setUserSession(event, {
    user: session.user,
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
  const session = await requireVerifiedUserSession(event) as any
  const body = await readBody(event)
  const action = String(body?.action || '')
  const email = String(session.user?.email || '').trim()
  const name = String(session.user?.name || '').trim() || null

  if (!email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No encontramos un correo valido para esta cuenta.'
    })
  }

  if (action === 'request-code') {
    const code = generateSixDigitCode()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_CODE_WINDOW_MS).toISOString()

    await savePasswordResetState(event, session, {
      code,
      expiresAt,
      verifiedAt: null
    })

    await sendAuthCodeEmail({
      to: email,
      name,
      subject: 'Codigo para cambiar tu contraseña - Bring Jobs',
      intro: 'Usa este codigo de 6 digitos para confirmar el cambio de contraseña desde la app.',
      code,
      footer: 'Si no solicitaste cambiar tu contraseña, ignora este correo. El codigo vence en 15 minutos.'
    })

    return {
      success: true,
      step: 'code-sent',
      expiresAt
    }
  }

  const state = getPasswordResetState(session)

  if (!state.code || !state.expiresAt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primero solicita un codigo de recuperacion.'
    })
  }

  if (isIsoDateExpired(state.expiresAt)) {
    await savePasswordResetState(event, session, {
      code: null,
      expiresAt: null,
      verifiedAt: null
    })

    throw createError({
      statusCode: 400,
      statusMessage: 'El codigo ya vencio. Solicita uno nuevo.'
    })
  }

  if (action === 'verify-code') {
    const code = assertSixDigitCode(body?.code)

    if (state.code !== code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Codigo de recuperacion incorrecto.'
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
      await savePasswordResetState(event, session, {
        ...state,
        verifiedAt: null
      })

      throw createError({
        statusCode: 403,
        statusMessage: 'Primero valida el codigo de recuperacion.'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const db = useDb()

    await db.execute({
      sql: 'UPDATE users SET password = ? WHERE id = ?',
      args: [hashedPassword, session.user.id]
    })

    await savePasswordResetState(event, session, {
      code: null,
      expiresAt: null,
      verifiedAt: null
    })

    return {
      success: true,
      step: 'completed'
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Accion de cambio de contraseña no valida.'
  })
})
