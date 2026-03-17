<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-dark-bg">
    <div class="auth-card w-full max-w-[400px] bg-dark-bg2 border border-border rounded-[8px] p-8 shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 right-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -mr-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-amber tracking-tighter mb-1">Bring Jobs</h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">// Verifica tu correo</p>
      </div>

      <div v-if="success" class="bg-amber/10 border border-amber/20 text-text p-4 rounded-[4px] text-center mb-6">
        <span class="material-symbols-outlined text-[32px] mb-2 block">task_alt</span>
        <p class="text-[14px] font-bold">¡Cuenta verificada!</p>
        <p class="text-[12px] opacity-80 mt-1">Redirigiendo...</p>
      </div>

      <form v-else @submit.prevent="handleVerify" class="space-y-6 relative z-10">
        <div class="text-center">
          <p class="text-[13px] text-text-dim mb-4">
            Hemos enviado un código de 6 dígitos a <br>
            <strong class="text-white">{{ user?.email }}</strong>
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
            class="bg-dark-bg border-2 border-border focus:border-amber outline-none rounded-[12px] w-full py-4 text-center text-3xl font-bold tracking-[10px] text-amber transition-all"
            required
            autofocus
          />
        </div>

        <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
          Verificar Código
        </AppButton>
        
        <div class="text-center">
          <button @click.prevent="logout" class="text-[12px] text-text-dim hover:text-white transition-colors underline">
            Cerrar sesión e intentar otro correo
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { user, logout } = useAuth()
const code = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleVerify = async () => {
  if (code.value.length !== 6) {
    error.value = 'El código debe tener 6 dígitos'
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
      navigateTo('/importar-cv')
    }, 1500)
  } catch (e) {
    error.value = e.data?.statusMessage || 'Error al verificar el código'
  } finally {
    loading.value = false
  }
}

// Redirect if already verified or not logged in
onMounted(() => {
  if (!user.value) navigateTo('/login')
  if (user.value?.is_verified) navigateTo('/importar-cv')
})
</script>

<style scoped>
.auth-page {
  background-image: 
    radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  background-size: 32px 32px;
}
</style>
