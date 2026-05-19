// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  modules: ['nuxt-auth-utils', '@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'en',
    strategy: 'no_prefix',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true
    },
    compilation: {
      strictMessage: false
    },
    vueI18n: './i18n.config.ts'
  },
  runtimeConfig: {
    // Private keys (available only on server)
    openaiApiKey: '',
    openaiTtsModel: 'tts-1-hd',
    openaiTtsVoice: 'nova',
    tursoUrl: '',
    tursoToken: '',
    apiToken: '',
    joobleApiKey: '',
    resendApiKey: '',
    lemonSqueezyWebhookSecret: '',
    neonDbUrl: '',

    public: {
      // Public variables (available on both client and server)
      lemonSqueezyCheckoutUrl: '',
    }
  },
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  },
  app: {
    head: {
      title: 'Bring Jobs | Optimiza tu CV con IA',
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' }
      ]
    }
  },
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
          'X-XSS-Protection': '1; mode=block'
        }
      }
    },
    rollupConfig: {
      external: ['@napi-rs/canvas']
    }
  },
  compatibilityDate: '2024-11-01',
})
