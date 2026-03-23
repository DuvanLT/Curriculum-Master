<script setup lang="ts">
import { getPasswordValidationError, passwordRequirementsText } from '../utils/password-validation'

definePageMeta({
  middleware: 'guest'
})

type PasswordResetStep = 'idle' | 'code-sent' | 'verified' | 'completed'
const toast = useToast()
const resetStep = ref<'idle' | 'code-sent' | 'verified' | 'completed'>('idle')
const email = ref('')
const resetCode = ref('')
const resetFeedback = ref('')
const resetFeedbackType = ref<'error' | 'success'>('success')
const requestingPasswordResetCode = ref(false)
const verifyingPasswordResetCode = ref(false)
const updatingPassword = ref(false)
const passwordResetForm = ref({
  password: '',
  confirmPassword: ''
})

const setResetFeedback = (message: string, type: 'error' | 'success') => {
  resetFeedback.value = message
  resetFeedbackType.value = type
}

const clearResetForm = () => {
  resetCode.value = ''
  passwordResetForm.value = {
    password: '',
    confirmPassword: ''
  }
}

const handleResetCodeInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  resetCode.value = target.value.replace(/\D/g, '').slice(0, 6)
}

const handleRequestPasswordResetCode = async () => {
  requestingPasswordResetCode.value = true
  resetFeedback.value = ''

  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: {
        action: 'request-code',
        email: email.value
      }
    })

    resetStep.value = 'code-sent'
    clearResetForm()
    setResetFeedback('Te enviamos un codigo de recuperacion a tu correo.', 'success')
    toast.success('Revisa tu correo para continuar.')
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || 'No pudimos enviar el codigo de recuperacion.', 'error')
    toast.error(e.data?.statusMessage || e.message || 'No pudimos enviar el codigo de recuperacion.')
  } finally {
    requestingPasswordResetCode.value = false
  }
}

const handleVerifyPasswordResetCode = async () => {
  if (resetCode.value.length !== 6) {
    setResetFeedback('El codigo debe tener 6 digitos.', 'error')
    return
  }

  verifyingPasswordResetCode.value = true
  resetFeedback.value = ''

  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: {
        action: 'verify-code',
        code: resetCode.value
      }
    })

    resetStep.value = 'verified'
    setResetFeedback('Codigo validado correctamente.', 'success')
    toast.success('Ahora puedes definir tu nueva contraseña.')
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || 'No pudimos validar el codigo.', 'error')
    toast.error(e.data?.statusMessage || e.message || 'No pudimos validar el codigo.')
  } finally {
    verifyingPasswordResetCode.value = false
  }
}

const handleUpdatePassword = async () => {
  if (passwordResetForm.value.password !== passwordResetForm.value.confirmPassword) {
    setResetFeedback('Las contraseñas no coinciden.', 'error')
    return
  }

  const passwordError = getPasswordValidationError(passwordResetForm.value.password)
  if (passwordError) {
    setResetFeedback(passwordError, 'error')
    return
  }

  updatingPassword.value = true
  resetFeedback.value = ''

  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: {
        action: 'update-password',
        password: passwordResetForm.value.password,
        confirmPassword: passwordResetForm.value.confirmPassword
      }
    })

    resetStep.value = 'completed'
    clearResetForm()
    setResetFeedback('Tu contraseña se actualizo correctamente.', 'success')
    toast.success('contraseña actualizada correctamente.')
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || 'No pudimos actualizar la contraseña.', 'error')
    toast.error(e.data?.statusMessage || e.message || 'No pudimos actualizar la contraseña.')
  } finally {
    updatingPassword.value = false
  }
}
</script>
<template>
    <div class="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <div class="space-y-6 max-w-[600px] mx-auto">
        <div class="border border-border/60 bg-[var(--bg)]-bg3/50 rounded-xl p-6">
          <!-- Main Reset Flow -->
          <div v-if="resetStep !== 'completed'">
            <div class="flex gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div class="flex items-center gap-3 mb-3">
                  <span class="material-symbols-outlined text-amber">lock_reset</span>
                  <h3 class="text-text font-head font-bold text-lg">Recuperar contraseña</h3>
                </div>
                <p class="text-[13px] text-text-muted max-w-2xl mb-3">
                  Enviaremos un código de 6 dígitos al correo con el cual te registraste para validar el cambio antes de guardar una nueva contraseña.
                </p>
                <form @submit.prevent="handleRequestPasswordResetCode">
                  <AppInput
                    v-model="email"
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    required
                  />
                  <AppButton
                    variant="primary"
                    :loading="requestingPasswordResetCode"
                    @click="handleRequestPasswordResetCode"
                  >
                    {{ resetStep === 'idle' ? 'Recuperar contraseña' : 'Reenviar código' }}
                  </AppButton>
                </form>
              </div>
            </div>

            <div
              v-if="resetFeedback"
              class="mt-4 border rounded-lg px-4 py-3 text-[12px] font-mono"
              :class="resetFeedbackType === 'error' ? 'bg-red/10 border-red/20 text-red' : 'bg-amber/10 border-amber/20 text-amber'"
            >
              {{ resetFeedback }}
            </div>

            <div v-if="resetStep !== 'idle'" class="mt-6 space-y-5">
              <div>
                <label class="block text-[12px] text-text-dim font-mono uppercase tracking-wider mb-2">
                  Código de recuperación
                </label>

                <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <input
                    :value="resetCode"
                    type="text"
                    inputmode="numeric"
                    maxlength="6"
                    placeholder="000000"
                    class="bg-[var(--bg)]-bg border-2 border-border focus:border-amber outline-none rounded-[12px] w-full py-4 text-center text-3xl font-bold tracking-[10px] text-amber transition-all"
                    @input="handleResetCodeInput"
                  />

                  <AppButton
                    variant="secondary"
                    class="lg:min-w-[170px]"
                    :loading="verifyingPasswordResetCode"
                    @click="handleVerifyPasswordResetCode"
                  >
                    Validar código
                  </AppButton>
                </div>

                <p class="text-[12px] text-text-dim mt-2">
                  El código vence en 15 minutos. Si pediste uno nuevo, solo el más reciente funciona.
                </p>
              </div>

              <div v-if="resetStep === 'verified'" class="border border-amber/20 bg-amber/5 rounded-xl p-5">
                <div class="flex items-center gap-2 text-amber mb-4">
                  <span class="material-symbols-outlined text-[18px]">verified</span>
                  <p class="text-[13px] font-medium">Código validado. Ya puedes definir una nueva contraseña.</p>
                </div>

                <div class="grid gap-2 lg:grid-cols-2">
                  <AppInput
                    v-model="passwordResetForm.password"
                    label="Nueva contraseña"
                    type="password"
                    placeholder="********"
                  />
                  <AppInput
                    v-model="passwordResetForm.confirmPassword"
                    label="Confirmar contraseña"
                    type="password"
                    placeholder="********"
                  />
                </div>

                <p class="text-[12px] text-text-dim mb-4">
                  {{ passwordRequirementsText }}
                </p>

                <AppButton :loading="updatingPassword" @click="handleUpdatePassword">
                  Guardar nueva contraseña
                </AppButton>
              </div>
            </div>
          </div>

          <!-- Success Screen -->
          <div v-if="resetStep === 'completed'" class="text-center py-6">
            <span class="material-symbols-outlined text-green-500 text-5xl mb-4">check_circle</span>
            <h4 class="text-text font-head font-bold text-xl mb-2">¡Contraseña actualizada!</h4>
            <p class="text-text-muted text-[13px] mb-6">Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales.</p>
           <NuxtLink  to="/login" >
            <AppButton variant="primary" class="w-full">
              Ir a iniciar sesión
            </AppButton>
           </NuxtLink>
          </div>
        </div>
      </div>
    </div>
</template>