<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-dark-bg">
    <div class="auth-card w-full max-w-[400px] bg-dark-bg2 border border-border rounded-[8px] p-8 shadow-2xl relative overflow-hidden">
      <!-- Decorative element -->
      <div class="absolute top-0 left-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -ml-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-amber tracking-tighter mb-1">Bring Jobs</h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">// Bienvenido de nuevo</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4 relative z-10">
        <div v-if="error" class="bg-red/10 border border-red/20 text-red text-[12px] p-3 rounded-[4px] font-mono">
          {{ error }}
        </div>

        <AppInput label="Email" type="email" v-model="form.email" placeholder="john@example.com" required />
        <AppInput label="Contraseña" type="password" v-model="form.password" placeholder="••••••••" required />

        <div class="pt-2">
          <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
            Iniciar Sesión
          </AppButton>
        </div>
      </form>

      <!--<div class="mt-8 text-center text-[13px] text-text-dim relative z-10">
        ¿No tienes cuenta? 
        <NuxtLink to="/signup" class="text-amber hover:underline font-medium ml-1">Regístrate gratis</NuxtLink>
      </div>-->
    </div>
  </div>
</template>

<script setup>
const { login } = useAuth()
const loading = ref(false)
const error = ref('')
const form = ref({
  email: '',
  password: ''
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  const result = await login(form.value.email.toLocaleLowerCase(), form.value.password)
  
  if (result.success) {
    navigateTo('/perfil')
  } else {
    error.value = result.error
  }
  
  loading.value = false
}
</script>

<style scoped>
.auth-page {
  background-image: 
    radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
  background-size: 32px 32px;
}
.auth-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
}
.auth-card:hover {
  transform: translateY(-2px);
}
</style>
