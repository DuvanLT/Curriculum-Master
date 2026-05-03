export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()

  if (!loggedIn.value) {
    return navigateTo('/signup')
  }
})
