export default defineNuxtRouteMiddleware((to) => {
  const { user, loggedIn } = useAuth()

  // If not logged in, let the auth-module (or other middleware) handle it
  if (!loggedIn.value) {
    return
  }

  // If user is logged in but not verified, and not already on the verify page
  // We also allow access to signup and login pages so they can switch accounts if needed
  /* const publicRoutes = ['/verify', '/signup', '/login']
  if (user.value && !user.value.is_verified && !publicRoutes.includes(to.path)) {
    return navigateTo('/verify')
  } */

  // If user is verified and trying to access the verify page
  if (user.value && user.value.is_verified && to.path === '/verify') {
    return navigateTo('/importar-cv')
  }
})
