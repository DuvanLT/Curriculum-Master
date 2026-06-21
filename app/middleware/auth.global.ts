export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useAuth()
  
  // Define public routes that don't require login
  const publicRoutes = ['/landing', '/login', '/signup', '/forgot-password', '/select-lang', '/free-trial']
  
  // If the user is on the root path, landing handles it (index.vue redirects to landing)
  if (to.path === '/' || publicRoutes.includes(to.path)) {
    return
  }

  // If not logged in and trying to access a protected route, redirect to login
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
