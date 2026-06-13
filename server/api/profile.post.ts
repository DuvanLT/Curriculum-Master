import { requireVerifiedUserSession } from '../utils/verified-session'
import { saveUserProfile } from '../utils/profile'

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedUserSession(event)
  const userId = session.user.id
  const body = await readBody(event)
  const profile = body?.profile || {}
  const educations = Array.isArray(body?.educations) ? body.educations : []
  const experiences = Array.isArray(body?.experiences) ? body.experiences : []

  // Input validation
  const inputSize = JSON.stringify({ profile, educations, experiences }).length
  if (inputSize > 50000) {
    throw createError({ statusCode: 400, statusMessage: 'Profile data is too large (max 50,000 chars).' })
  }

  if (profile.nombre && String(profile.nombre).length > 100) profile.nombre = String(profile.nombre).substring(0, 100)
  if (profile.titulo && String(profile.titulo).length > 150) profile.titulo = String(profile.titulo).substring(0, 150)
  if (profile.resumen && String(profile.resumen).length > 2000) profile.resumen = String(profile.resumen).substring(0, 2000)

  const db = useDb()

  try {
    await saveUserProfile(db, userId, { profile, educations, experiences })
  } catch (error) {
    console.error('Error saving profile:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'No se pudieron guardar los cambios del perfil.'
    })
  }

  try {
    await setUserSession(event, {
      user: {
        ...session.user,
        name: profile.nombre
      }
    })
  } catch (error) {
    console.error('Error updating profile session:', error)
  }

  return { success: true }
})
