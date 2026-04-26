export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    const saved = localStorage.getItem('preferred-locale')
    if (saved && ['es', 'en'].includes(saved)) {
      const i18n = nuxtApp.$i18n as any
      if (i18n && i18n.locale) {
        i18n.locale.value = saved
      }
    }
  })
})
