export const useAuth = () => {
  const { user, fetch: fetchSession, clear: clearSession } = useUserSession()
  const { fetchProfile, resetProfileState } = useAppState()
  const loggingOut = useState('auth-logging-out', () => false)
  
  const loggedIn = computed(() => !!user.value && !loggingOut.value)

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const data = await $fetch<{ user: any }>('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name, locale: useNuxtApp().$i18n.locale.value }
      })
      await fetchSession()
      await fetchProfile(true)
      
      if (!data.user.is_verified) {
        navigateTo('/verify')
      }
      
      return { success: true, user: data.user }
    } catch (e: any) {
      return { success: false, error: e.data?.statusMessage || 'Error al registrarse' }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const data = await $fetch<{ user: any }>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      await fetchSession()
      await fetchProfile(true)

      // Apply the user's stored language preference
      if (data.user.preferred_locale && ['es', 'en'].includes(data.user.preferred_locale)) {
        const i18n = useNuxtApp().$i18n as any
        if (i18n && typeof i18n.setLocale === 'function') {
          i18n.setLocale(data.user.preferred_locale)
        } else if (i18n?.locale) {
          i18n.locale.value = data.user.preferred_locale
        }
      }

      if (!data.user.is_verified) {
        navigateTo('/verify')
      }

      return { success: true, user: data.user }
    } catch (e: any) {
      return { success: false, error: e.data?.statusMessage || 'Error al iniciar sesión' }
    }
  }

  const logout = async () => {
    if (loggingOut.value) {
      return
    }

    loggingOut.value = true

    try {
      await clearSession()
      resetProfileState()
    } finally {
      loggingOut.value = false
    }
  }

  return {
    user,
    loggedIn,
    loggingOut,
    signup,
    login,
    logout
  }
}
