export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, instance, info) => {
    // In production, suppress full stack traces from the client console
    if (import.meta.env.PROD) {
      console.error('[App Error]', (error as Error)?.message || 'Unknown error')
      return
    }
    // In dev, log everything
    console.error('[Vue Error]', error, info)
  })
})
