<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Ajustes</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Configura tu cuenta y gestiona tus preferencias.</div>

      <div class="flex gap-4 mb-6 border-b border-border/50">
        <button
          @click="activeTab = 'session'"
          class="pb-2 text-[13px] font-mono transition-all relative"
          :class="activeTab === 'session' ? 'text-amber' : 'text-text-dim hover:text-text'"
        >
          Sesion
          <div v-if="activeTab === 'session'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber"></div>
        </button>
        <button
          @click="activeTab = 'privacy'"
          class="pb-2 text-[13px] font-mono transition-all relative"
          :class="activeTab === 'privacy' ? 'text-amber' : 'text-text-dim hover:text-text'"
        >
          Privacidad
          <div v-if="activeTab === 'privacy'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber"></div>
        </button>
      </div>

      <div v-if="activeTab === 'session'">
        <AppCard title="Gestion de Sesion">
          <p class="text-[13px] text-text-muted mb-4">
            Has iniciado sesion como <strong class="text-text">{{ user?.email }}</strong>.
          </p>
          <AppButton variant="secondary" :loading="loggingOut" @click="handleLogout">
            <span class="material-symbols-outlined text-[18px] mr-2">logout</span>
            Cerrar sesion en este dispositivo
          </AppButton>
        </AppCard>
      </div>

      <div v-else-if="activeTab === 'privacy'">
        <AppCard title="Privacidad y Datos">
          <div class="space-y-6">
            <div class="border border-border/60 bg-[var(--bg)]-bg3/50 rounded-xl p-6">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="flex items-center gap-3 mb-3">
                    <span class="material-symbols-outlined text-amber">lock_reset</span>
                    <h3 class="text-text font-head font-bold text-lg">Recuperar contraseña</h3>
                  </div>
                  <p class="text-[13px] text-text-muted max-w-2xl">
                    Enviaremos un codigo de 6 digitos a <strong class="text-text">{{ user?.email }}</strong> para validar el cambio antes de guardar una nueva contraseña.
                  </p>
                </div>

                <AppButton
                  variant="primary"
                  :loading="requestingPasswordResetCode"
                  @click="handleRequestPasswordResetCode"
                >
                  {{ resetStep === 'idle' ? 'Recuperar contraseña' : 'Reenviar codigo' }}
                </AppButton>
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
                    Codigo de recuperacion
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
                      Validar codigo
                    </AppButton>
                  </div>

                  <p class="text-[12px] text-text-dim mt-2">
                    El codigo vence en 15 minutos. Si pediste uno nuevo, solo el mas reciente funciona.
                  </p>
                </div>

                <div v-if="resetStep === 'verified'" class="border border-amber/20 bg-amber/5 rounded-xl p-5">
                  <div class="flex items-center gap-2 text-amber mb-4">
                    <span class="material-symbols-outlined text-[18px]">verified</span>
                    <p class="text-[13px] font-medium">Codigo validado. Ya puedes definir una nueva contraseña.</p>
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

            <div class="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-red-500">warning</span>
                <h3 class="text-red-500 font-head font-bold text-lg">Zona de Peligro</h3>
              </div>
              <p class="text-[13px] text-text-muted mb-6">
                Al eliminar tu cuenta, todos tus registros (experiencias, aplicaciones, retos y analisis) seran borrados permanentemente. Esta accion no se puede deshacer.
              </p>
              <AppButton
                variant="secondary"
                class="!border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-text-dim transition-all"
                @click="showDeleteModal = true"
              >
                Borrar mi cuenta definitivamente
              </AppButton>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Churn Feedback Modal -->
      <Transition name="modal">
        <div v-if="showDeleteModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div class="absolute inset-0" style="background: var(--overlay); backdrop-filter: blur(10px)" @click="closeDeleteModal"></div>

          <div class="relative w-full max-w-md rounded-xl p-8 overflow-hidden" style="background: var(--bg2); border: 1px solid var(--border); box-shadow: var(--shadow-soft)">

            <!-- Step 1: Reason -->
            <div v-if="deleteStep === 1">
              <h2 class="text-xl font-bold mb-1 font-head tracking-tight text-text">¿Por qué te vas?</h2>
              <p class="text-[13px] text-text-dim mb-6">Tu respuesta nos ayuda a mejorar BringJobs para todos.</p>

              <div class="flex flex-col gap-2 mb-5">
                <label
                  v-for="opt in churnReasons"
                  :key="opt.value"
                  class="churn-option"
                  :class="{ 'churn-option-selected': churnReason === opt.value }"
                >
                  <input type="radio" :value="opt.value" v-model="churnReason" class="hidden" />
                  <span class="material-symbols-outlined text-[18px] flex-shrink-0">{{ opt.icon }}</span>
                  <span class="text-[13px]">{{ opt.label }}</span>
                </label>
              </div>

              <div v-if="churnReason" class="mb-6">
                <textarea
                  v-model="churnComment"
                  placeholder="Opcional: cuéntanos más..."
                  rows="2"
                  class="churn-textarea w-full"
                ></textarea>
              </div>

              <div class="flex gap-3">
                <AppButton class="flex-1" variant="secondary" @click="closeDeleteModal">Cancelar</AppButton>
                <AppButton class="flex-1" variant="primary" :disabled="!churnReason" @click="deleteStep = 2">Continuar</AppButton>
              </div>
            </div>

            <!-- Step 2: Final Confirm -->
            <div v-else-if="deleteStep === 2">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-red-500 text-3xl">warning</span>
                <h2 class="text-xl font-bold font-head tracking-tight text-red-500">Eliminar cuenta</h2>
              </div>
              <p class="text-[13px] text-text-muted mb-6 leading-relaxed">
                ¿Estás absolutamente seguro? Todos tus datos serán eliminados de nuestros servidores para siempre. Esta acción no se puede deshacer.
              </p>
              <div class="flex gap-3">
                <AppButton class="flex-1" variant="secondary" @click="deleteStep = 1">Atrás</AppButton>
                <AppButton
                  class="flex-1 !border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-white"
                  variant="secondary"
                  :loading="deletingAccount"
                  @click="handleDeleteAccount"
                >
                  Sí, eliminar
                </AppButton>
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { getPasswordValidationError, passwordRequirementsText } from '../utils/password-validation'

definePageMeta({
  middleware: 'auth'
})

type PasswordResetStep = 'idle' | 'code-sent' | 'verified'

const { user, logout, loggingOut } = useAuth()
const toast = useToast()

const activeTab = ref('session')
const showDeleteModal = ref(false)
const deleteStep = ref(1)
const churnReason = ref('')
const churnComment = ref('')
const deletingAccount = ref(false)

const churnReasons = [
  { value: 'no_lo_necesito', label: 'Ya no busco trabajo activamente', icon: 'check_circle' },
  { value: 'falta_funciones', label: 'Le faltan funciones que necesito', icon: 'build' },
  { value: 'dificil_de_usar', label: 'Es difícil de usar', icon: 'sentiment_dissatisfied' },
  { value: 'encontre_alternativa', label: 'Encontré una alternativa mejor', icon: 'swap_horiz' },
  { value: 'privacidad', label: 'Preocupaciones de privacidad', icon: 'shield' },
  { value: 'otro', label: 'Otro motivo', icon: 'more_horiz' },
]

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteStep.value = 1
  churnReason.value = ''
  churnComment.value = ''
}
const resetStep = ref<PasswordResetStep>('idle')
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
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: {
        action: 'request-code'
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
    await $fetch('/api/auth/update-password', {
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
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: {
        action: 'update-password',
        password: passwordResetForm.value.password,
        confirmPassword: passwordResetForm.value.confirmPassword
      }
    })

    resetStep.value = 'idle'
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

const handleLogout = async () => {
  try {
    await logout()
    await navigateTo('/login', { replace: true })
  } catch (e) {
    toast.error('Error al cerrar sesion')
  }
}

const handleDeleteAccount = async () => {
  deletingAccount.value = true
  
  try {
    await $fetch<any>('/api/profile', {
      method: 'DELETE',
      body: {
        reason: churnReason.value,
        comment: churnComment.value || null
      }
    })
  } catch (e: any) {
    console.error(e)
    toast.error('Error al intentar eliminar la cuenta: ' + (e.statusMessage || e.message))
    deletingAccount.value = false
    showDeleteModal.value = false
    return
  }

  try {
    await logout()
  } catch (e) {
    console.error('Logout error:', e)
  }

  // Use a hard redirect to ensure the user is taken to login and all state is wiped
  window.location.href = '/login'
}
</script>

<style scoped>
.churn-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-dim);
}

.churn-option:hover {
  border-color: var(--amber);
  color: var(--text);
}

.churn-option-selected {
  background: color-mix(in srgb, var(--amber) 10%, transparent);
  border-color: var(--amber);
  color: var(--amber);
}

.churn-textarea {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  color: var(--text);
  font-size: 13px;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.churn-textarea:focus {
  border-color: var(--amber);
}
</style>
