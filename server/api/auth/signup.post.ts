import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  /* throw createError({
     statusCode: 403,
     statusMessage: 'Registration is currently disabled for Closed Beta.'
   })*/

  const body = await readBody(event)
  const { email, password, name } = body

  // Email validation regex (basic pattern)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Formato de correo electrónico inválido.'
    })
  }

  if (!password || password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña debe tener al menos 8 caracteres.'
    })
  }

  // Password complexity: Uppercase, Number, Symbol
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  if (!hasUppercase || !hasNumber || !hasSymbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La contraseña debe incluir al menos una mayúscula, un número y un símbolo especial.'
    })
  }

  const db = useDb()

  // Check if user exists
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email]
  })

  if (existingUser.rows.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User already exists'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const id = uuidv4()

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

  await db.execute({
    sql: 'INSERT INTO users (id, email, email_profile, password, name, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, 0, ?)',
    args: [id, email, null, hashedPassword, name || null, verificationCode]
  })

  // Send verification email
  const config = useRuntimeConfig()
  if (config.resendApiKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(config.resendApiKey)

      await resend.emails.send({
        from: 'no-reply@wikisportco.com', // Default sender for testing
        to: email,
        subject: 'Código de verificación - Bring Jobs',
        html: `
         <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h1 style="color: #f59e0b; text-align: center;">Bring Jobs</h1>
           <p style="font-size: 16px; color: #333;">¡Hola ${name || 'usuario'}!</p>
           <p style="font-size: 16px; color: #333;">Gracias por unirte a Bring Jobs. Para completar tu registro, utiliza el siguiente código de verificación:</p>
           <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
             <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f59e0b;">${verificationCode}</span>
           </div>
           <p style="font-size: 14px; color: #666; text-align: center;">Si no solicitaste este registro, por favor ignora este correo.</p>
         </div>
       `
      })
    } catch (error) {
      console.error('Error sending email with Resend:', error)
      // We don't block registration if email fails for now, but we might want to in production
    }
  }

  const user = { id, email, name, is_verified: 0 }

  // Set session
  await setUserSession(event, { user })

  return { user }
})
