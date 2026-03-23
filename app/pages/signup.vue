<template>
  <div class="auth-page min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
    <div class="auth-card w-full max-w-[400px] border border-border rounded-[8px] p-8 relative overflow-hidden">
      <!-- Decorative element -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-amber opacity-5 blur-[80px] -mr-16 -mt-16"></div>
      
      <div class="text-center mb-8 relative z-10">
        <h1 class="font-head text-[28px] font-bold text-text tracking-tighter mb-1">Bring<span class="text-amber">Jobs</span></h1>
        <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">Crea tu cuenta</p>
      </div>

      <form @submit.prevent="handleSignup" class="space-y-4 relative z-10">
        <div v-if="error" class="bg-red/10 border border-red/20 text-red text-[12px] p-3 rounded-[4px] font-mono">
          {{ error }}
        </div>

         <!--
        <div class="space-y-6 relative z-10 text-center py-6">
        <div class="bg-amber/10 border border-amber/20 text-text p-6 rounded-[8px] font-sans">
          <span class="material-symbols-outlined text-[48px] text-amber mb-4">lock</span>
          <h2 class="text-[18px] font-bold mb-2">Beta Cerrada</h2>
          <p class="text-[13px] text-text-dim leading-relaxed">
            Actualmente nos encontramos en una fase de <strong>Beta Cerrada</strong>. 
            El registro público no está disponible en este momento.
          </p>
        </div>
        </div>
       -->
        <AppInput label="Nombre completo" v-model="form.name" placeholder="John Arias" required />
        <AppInput label="Email" type="email" v-model="form.email" placeholder="john@example.com" required />
        <AppInput label="Contraseña" type="password" v-model="form.password" placeholder="••••••••" required />
        <AppInput label="Confirmar contraseña" type="password" v-model="form.confirmPassword" placeholder="••••••••" required />
  
        <div class="pt-2">
          <AppButton type="submit" :loading="loading" class="w-full h-[45px]">
            Registrarse
          </AppButton>
        </div>
      
      </form>

      <div class="mt-8 text-center text-[13px] text-text-dim relative z-10">
        ¿Ya tienes cuenta? 
        <NuxtLink to="/login" class="text-amber hover:underline font-medium ml-1">Inicia sesión</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest'
})
const { signup } = useAuth()
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
    error.value = 'Las contraseñas no coinciden'
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
