export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side (localStorage is not available on server)
  if (import.meta.server) return

  // Don't redirect if already on the language selection page
  if (to.path === '/select-lang') return

  // If no locale preference has been set yet, redirect to language selection
  const saved = localStorage.getItem('preferred-locale')
  if (!saved || !['es', 'en'].includes(saved)) {
    return navigateTo('/select-lang')
  }
})
