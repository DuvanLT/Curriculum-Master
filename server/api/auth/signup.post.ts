import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { getAnonId, clearAnonId } from '../../utils/anon-trial'
import { saveUserProfile } from '../../utils/profile'

export default defineEventHandler(async (event) => {
  /* throw createError({
     statusCode: 403,
     statusMessage: 'Registration is currently disabled for Closed Beta.'
   })*/

  const body = await readBody(event)
  const { email, password, name, locale = 'es' } = body
  const isEn = locale === 'en'

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
    sql: 'INSERT INTO users (id, email, email_profile, password, name, is_verified, verification_code, preferred_locale, subscription_name) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    args: [id, email, null, hashedPassword, name || null, verificationCode, locale, 'free_trial']
  })

  // ─── Migrate anonymous trial data, if any ───
  let fromTrial = false
  try {
    const anonId = getAnonId(event)
    if (anonId) {
      const trialResult = await db.execute({
        sql: `SELECT profile_json, experiences_json, educations_json, audit_result_json,
                     jd_text, analysis_result_json
              FROM anonymous_trials
              WHERE id = ? AND migrated_to_user_id IS NULL`,
        args: [anonId]
      })
      const trial = trialResult.rows[0] as any

      if (trial?.profile_json) {
        const profile = JSON.parse(trial.profile_json as string)
        const experiences = trial.experiences_json ? JSON.parse(trial.experiences_json as string) : []
        const educations = trial.educations_json ? JSON.parse(trial.educations_json as string) : []

        await saveUserProfile(db, id, { profile, educations, experiences })

        if (trial.audit_result_json) {
          const auditResult = JSON.parse(trial.audit_result_json as string)
          await db.execute({
            sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              id,
              'Auditoría inicial de CV',
              'Auditoría General',
              'Diagnóstico de perfil',
              auditResult.score || 0,
              JSON.stringify({
                keywords_presentes: auditResult.fortalezas || [],
                keywords_faltantes: auditResult.debilidades || [],
                analisis: auditResult.recomendacion || '',
                recomendaciones: auditResult.debilidades || [],
                hard_skills_jd: []
              })
            ]
          })
        }

        if (trial.analysis_result_json) {
          const analysisResult = JSON.parse(trial.analysis_result_json as string)
          await db.execute({
            sql: `INSERT INTO job_analyses (id, user_id, jd_text, company, position, score, analysis_json)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
              uuidv4(),
              id,
              trial.jd_text || '',
              (analysisResult.company && analysisResult.company !== 'N/A' && analysisResult.company !== 'null') ? analysisResult.company : null,
              (analysisResult.position && analysisResult.position !== 'N/A' && analysisResult.position !== 'null') ? analysisResult.position : null,
              analysisResult.score || 0,
              trial.analysis_result_json
            ]
          })
        }

        await db.execute({
          sql: 'UPDATE anonymous_trials SET migrated_to_user_id = ? WHERE id = ?',
          args: [id, anonId]
        })

        clearAnonId(event)
        fromTrial = true
      }
    }
  } catch (error) {
    console.error('Error migrating anonymous trial data:', error)
  }

  // Send verification email
  const config = useRuntimeConfig()
  if (config.resendApiKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(config.resendApiKey)

      const emailSubject = isEn ? 'Verification Code - BringJobs' : 'Código de verificación - Bring Jobs'
      const emailTitle = isEn ? `Hello ${name || 'user'}!` : `¡Hola ${name || 'usuario'}!`
      const emailBody = isEn
        ? 'Thanks for joining BringJobs. To complete your registration, use the following verification code:'
        : 'Gracias por unirte a Bring Jobs. Para completar tu registro, utiliza el siguiente código de verificación:'
      const emailFooter = isEn
        ? 'If you did not request this registration, please ignore this email.'
        : 'Si no solicitaste este registro, por favor ignora este correo.'

      await resend.emails.send({
        from: 'no-reply@wikisportco.com',
        to: email,
        subject: emailSubject,
        html: `
         <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
           <h1 style="color: #2563eb; text-align: center;">BringJobs</h1>
           <p style="font-size: 16px; color: #333;">${emailTitle}</p>
           <p style="font-size: 16px; color: #333;">${emailBody}</p>
           <div style="background-color: #f9f9f9; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
             <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${verificationCode}</span>
           </div>
           <p style="font-size: 14px; color: #666; text-align: center;">${emailFooter}</p>
         </div>
       `
      })
    } catch (error) {
      console.error('Error sending email with Resend:', error)
      // We don't block registration if email fails for now, but we might want to in production
    }
  }

  const user = { id, email, name, is_verified: 0, preferred_locale: locale, subscription_name: 'free_trial', last_payment_at: null, from_trial: fromTrial }

  // Set session
  await setUserSession(event, { user })

  return { user }
})
