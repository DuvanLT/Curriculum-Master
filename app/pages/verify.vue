<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="auth-card w-full max-w-[400px] border border-border rounded-[8px] p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -mr-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-black tracking-tighter mb-1">Bring<span class="text-amber">Jobs</span></h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">{{ t('auth.verify_title') }}</p>
      </div>

      <div v-if="success" class="bg-amber/10 border border-amber/20 text-text p-4 rounded-[4px] text-center mb-6">
        <span class="material-symbols-outlined text-[32px] mb-2 block">task_alt</span>
        <p class="text-[14px] font-bold">{{ t('auth.verify_success_title') }}</p>
        <p class="text-[12px] opacity-80 mt-1">{{ t('auth.verify_redirecting') }}</p>
      </div>

      <form v-else @submit.prevent="handleVerify" class="space-y-6 relative z-10">
        <div class="text-center">
          <p class="text-[13px] text-text-dim mb-4">
            {{ t('auth.verify_code_sent') }} <br>
            <strong class="text-text">{{ user?.email }}</strong>
          </p>
        </div>

        <div v-if="error" class="bg-red/10 border border-red/20 text-red text-[12px] p-3 rounded-[4px] font-mono mb-4 text-center">
          {{ error }}
        </div>

        <div class="flex justify-center">
          <input 
            v-model="code"
            type="text"
            maxlength="6"
            placeholder="000000"
            class="verify-code-input w-full py-4 text-center text-3xl font-bold tracking-[10px] text-amber transition-all"
            required
            autofocus
          />
        </div>

        <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
          {{ t('auth.verify_btn') }}
        </AppButton>
        
        <div class="text-center">
          <button @click.prevent="handleLogout" class="text-[12px] text-text-dim hover:text-text transition-colors underline">
            {{ t('auth.verify_logout') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { user, logout } = useAuth()
const { t } = useI18n()
const code = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleLogout = async () => {
  await logout()
  window.location.href = '/login'
}

const handleVerify = async () => {
  if (code.value.length !== 6) {
    error.value = t('auth.verify_code_length')
    return
  }

  loading.value = true
  error.value = ''

  try {
    await $fetch('/api/auth/verify', {
      method: 'POST',
      body: { code: code.value }
    })
    
    success.value = true
    
    // Refresh user session state
    const { fetch: fetchSession } = useUserSession()
    await fetchSession()
    
    setTimeout(() => {
      navigateTo('/import-cv')
    }, 1500)
  } catch (e) {
    error.value = e.data?.statusMessage || t('auth.verify_error')
  } finally {
    loading.value = false
  }
}

// Redirect if already verified or not logged in
onMounted(() => {
  if (!user.value) navigateTo('/login')
  if (user.value?.is_verified) navigateTo('/import-cv')
})
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
}

.verify-code-input {
  background: var(--bg);
  border: 2px solid var(--border);
  outline: none;
  border-radius: 12px;
  color: var(--amber);
}

.verify-code-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px rgba(var(--amber-rgb), 0.14);
}
</style>
