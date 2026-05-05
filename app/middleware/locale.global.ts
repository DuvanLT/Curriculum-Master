export default defineNuxtRouteMiddleware((to) => {
  // Only run on client side (localStorage is not available on server)
  if (import.meta.server) return

  // Don't redirect if already on the language selection page
  if (to.path === '/select-lang') return

  // If no locale preference has been set yet, default to English
  const saved = localStorage.getItem('preferred-locale')
  if (!saved || !['es', 'en'].includes(saved)) {
    localStorage.setItem('preferred-locale', 'en')
    
    // We don't need to force a redirect anymore, the app will use the default locale
  }
})
