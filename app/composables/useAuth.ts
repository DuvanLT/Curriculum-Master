export const useAuth = () => {
  const { user, session, fetch: fetchSession, clear: clearSession } = useUserSession()
  
  const loggedIn = computed(() => !!user.value)

  const signup = async (email: string, password: string, name?: string) => {
    try {
      const data = await $fetch<{ user: any }>('/api/auth/signup', {
        method: 'POST',
        body: { email, password, name }
      })
      await fetchSession()
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
      return { success: true, user: data.user }
    } catch (e: any) {
      return { success: false, error: e.data?.statusMessage || 'Error al iniciar sesión' }
    }
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clearSession()
    navigateTo('/login')
  }

  return {
    user,
    loggedIn,
    signup,
    login,
    logout
  }
}
