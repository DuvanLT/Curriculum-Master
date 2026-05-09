<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="auth-card w-full max-w-[400px] border border-border rounded-[8px] p-8 relative overflow-hidden">
      <!-- Decorative element -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -mr-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-text tracking-tighter mb-1">Bring<span class="text-amber">Jobs</span></h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">{{ t('auth.create_account') }}</p>
      </div>

      <form @submit.prevent="handleSignup" class="space-y-4 relative z-10">
        <div v-if="error" class="bg-red/10 border border-red/20 text-red text-[12px] p-3 rounded-[4px] font-mono">
          {{ error }}
        </div>

         <!--
        <div class="space-y-6 relative z-10 text-center py-6">
        <div class="bg-amber/10 border border-amber/20 text-text p-6 rounded-[8px] font-sans">
          <span class="material-symbols-outlined text-[48px] text-amber mb-4">lock</span>
          <h2 class="text-[18px] font-bold mb-2">{{ t('auth.closed_beta_title') }}</h2>
          <p class="text-[13px] text-text-dim leading-relaxed" v-html="t('auth.closed_beta_desc')"></p>
        </div>
        </div>
       -->

        <AppInput :label="t('auth.name_label')" v-model="form.name" :placeholder="t('auth.name_placeholder')" autocomplete="name" required maxlength="50" minlength="5" />
        <AppInput :label="t('auth.email_label')" type="email" v-model="form.email" :placeholder="t('auth.email_placeholder')" autocomplete="email" required maxlength="50" minlength="3" />
        <AppInput :label="t('auth.password_label')" type="password" v-model="form.password" :placeholder="t('auth.password_placeholder')" autocomplete="new-password" required maxlength="20" minlength="8" />
        <AppInput :label="t('auth.confirm_password_label')" type="password" v-model="form.confirmPassword" :placeholder="t('auth.password_placeholder')" autocomplete="new-password" required maxlength="20" minlength="8" />
  
        <div class="pt-2">
          <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
            {{ t('auth.btn_signup') }}
          </AppButton>
        </div>
      
      </form>

      <div class="mt-8 text-center text-[13px] text-text-dim relative z-10">
        {{ t('auth.already_have_account') }} 
        <NuxtLink to="/login" class="text-amber hover:underline font-medium ml-1">{{ t('auth.login_now') }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'guest'
})
const { signup } = useAuth()
const { t } = useI18n()

useSeoMeta({
  title: () => t('seo.signup.title'),
  description: () => t('seo.signup.description'),
  ogTitle: () => t('seo.signup.title'),
  ogDescription: () => t('seo.signup.description'),
  ogImage: 'https://bringjobs.qaliby.com/og-image.png',
  ogUrl: 'https://bringjobs.qaliby.com/signup',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('seo.signup.title'),
  twitterDescription: () => t('seo.signup.description'),
  twitterImage: 'https://bringjobs.qaliby.com/og-image.png',
})

useHead({
  link: [
    { rel: 'canonical', href: 'https://bringjobs.qaliby.com/signup' }
  ]
})

const loading = ref(false)
const error = ref('')
const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const handleSignup = async () => {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = t('auth.passwords_mismatch')
    return
  }

  loading.value = true
  error.value = ''
  
  const result = await signup(form.value.email.toLocaleLowerCase(), form.value.password, form.value.name)
  
  if (result.success) {
    // Navigación handled inside useAuth or by middleware
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
