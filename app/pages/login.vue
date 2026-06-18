<template>
  <div class="auth-page min-h-dvh flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="auth-card w-full max-w-[400px] border border-border rounded-[8px] p-8 relative overflow-hidden">
      <!-- Decorative element -->
      <div class="absolute top-0 left-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -ml-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-text tracking-tighter mb-1">Bring<span class="text-amber">Jobs</span></h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">{{ t('auth.welcome_back') }}</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4 relative z-10">
        <div v-if="error" class="bg-red/10 border border-red/20 text-red text-[12px] p-3 rounded-[4px] font-mono">
          {{ error }}
        </div>

        <AppInput :label="t('auth.email_label')" type="email" v-model="form.email" :placeholder="t('auth.email_placeholder')" autocomplete="email" required />
        <AppInput :label="t('auth.password_label')" type="password" v-model="form.password" :placeholder="t('auth.password_placeholder')" autocomplete="current-password" required />

        <div class="pt-2">
          <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
            {{ t('auth.btn_login') }}
          </AppButton>
        </div>
      </form>

      <div class="flex items-center gap-3 my-6 relative z-10">
        <div class="h-px flex-1 bg-border"></div>
        <span class="font-mono text-[11px] text-text-dim uppercase">{{ t('auth.or') }}</span>
        <div class="h-px flex-1 bg-border"></div>
      </div>

      <a href="/auth/google"
         class="relative z-10 flex items-center justify-center gap-2 w-full h-[45px] border border-border rounded-[4px] text-[14px] font-medium text-text hover:bg-bg transition-colors">
        <img src="https://www.google.com/favicon.ico" alt="" class="w-4 h-4" />
        {{ t('auth.continue_with_google') }}
      </a>

      <div class="mt-8 text-center text-[13px] text-text-dim relative z-10">
        {{ t('auth.no_account') }}
        <NuxtLink to="/signup" class="text-amber hover:underline font-medium ml-1">{{ t('auth.register_free') }}</NuxtLink>
      </div>
      <div class="mt-2 text-center text-[13px] text-text-dim relative z-10">
        {{ t('auth.forgot_password') }} 
        <NuxtLink to="/forgot-password" class="text-amber hover:underline font-medium ml-1">{{ t('auth.recover_it') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest'
})
const { login } = useAuth()
const { t } = useI18n()

useSeoMeta({
  title: () => t('seo.login.title'),
  description: () => t('seo.login.description'),
  ogTitle: () => t('seo.login.title'),
  ogDescription: () => t('seo.login.description'),
  ogImage: 'https://bringjobs.qaliby.com/og-image.png',
  ogUrl: 'https://bringjobs.qaliby.com/login',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.login.title'),
  twitterDescription: () => t('seo.login.description'),
  twitterImage: 'https://bringjobs.qaliby.com/og-image.png',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://bringjobs.qaliby.com/login' }
  ]
})
const loading = ref(false)
const error = ref('')
const form = ref({
  email: '',
  password: ''
})

const route = useRoute()
onMounted(() => {
  if (route.query.error === 'google') {
    error.value = t('auth.google_error')
  }
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await login(form.value.email.toLocaleLowerCase(), form.value.password)
  
  if (result.success) {
    navigateTo('/profile')
  } else {
    error.value = result.error
  }
  
  loading.value = false
}
</script>

<style scoped>
.auth-page {
  background-image: 
    radial-gradient(circle at 2px 2px, rgba(37, 99, 235, 0.08) 1px, transparent 0);
  background-size: 32px 32px;
}
.auth-card {
  background: var(--bg2);
  box-shadow: var(--shadow-soft);
  transition: transform 0.3s ease;
}
.auth-card:hover {
  transform: translateY(-2px);
}
</style>
