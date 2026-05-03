<script setup lang="ts">
import { getPasswordValidationError, passwordRequirementsText } from '../utils/password-validation'

definePageMeta({
  middleware: 'guest'
})

const { locale, t } = useI18n()

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
        email: email.value,
        locale: locale.value
      }
    })

    resetStep.value = 'code-sent'
    clearResetForm()
    setResetFeedback(t('auth.recover_toast_code_sent'), 'success')
    toast.success(t('auth.recover_toast_check_email'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('auth.recover_toast_code_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('auth.recover_toast_code_error'))
  } finally {
    requestingPasswordResetCode.value = false
  }
}

const handleVerifyPasswordResetCode = async () => {
  if (resetCode.value.length !== 6) {
    setResetFeedback(t('auth.recover_toast_code_length'), 'error')
    return
  }

  verifyingPasswordResetCode.value = true
  resetFeedback.value = ''

  try {
    await $fetch('/api/auth/password-reset', {
      method: 'POST',
      body: {
        action: 'verify-code',
        code: resetCode.value,
        locale: locale.value
      }
    })

    resetStep.value = 'verified'
    setResetFeedback(t('auth.recover_toast_code_verified'), 'success')
    toast.success(t('auth.recover_toast_set_pwd'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('auth.recover_toast_verify_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('auth.recover_toast_verify_error'))
  } finally {
    verifyingPasswordResetCode.value = false
  }
}

const handleUpdatePassword = async () => {
  if (passwordResetForm.value.password !== passwordResetForm.value.confirmPassword) {
    setResetFeedback(t('auth.recover_toast_pwd_mismatch'), 'error')
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
        confirmPassword: passwordResetForm.value.confirmPassword,
        locale: locale.value
      }
    })

    resetStep.value = 'completed'
    clearResetForm()
    setResetFeedback(t('auth.recover_toast_pwd_updated'), 'success')
    toast.success(t('auth.recover_toast_pwd_success'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('auth.recover_toast_pwd_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('auth.recover_toast_pwd_error'))
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
                  <h3 class="text-text font-head font-bold text-lg">{{ t('auth.recover_title') }}</h3>
                </div>
                <p class="text-[13px] text-text-muted max-w-2xl mb-3">
                  {{ t('auth.recover_desc') }}
                </p>
                <form @submit.prevent="handleRequestPasswordResetCode">
                  <AppInput
                    v-model="email"
                    :label="t('auth.email_label')"
                    type="email"
                    :placeholder="t('auth.email_placeholder')"
                    required
                  />
                  <AppButton
                    variant="primary"
                    :loading="requestingPasswordResetCode"
                    @click="handleRequestPasswordResetCode"
                  >
                    {{ resetStep === 'idle' ? t('auth.recover_btn') : t('auth.recover_resend') }}
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
                  {{ t('auth.recover_code_label') }}
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
                    {{ t('auth.recover_validate_btn') }}
                  </AppButton>
                </div>

                <p class="text-[12px] text-text-dim mt-2">
                  {{ t('auth.recover_code_expires') }}
                </p>
              </div>

              <div v-if="resetStep === 'verified'" class="border border-amber/20 bg-amber/5 rounded-xl p-5">
                <div class="flex items-center gap-2 text-amber mb-4">
                  <span class="material-symbols-outlined text-[18px]">verified</span>
                  <p class="text-[13px] font-medium">{{ t('auth.recover_code_validated') }}</p>
                </div>

                <div class="grid gap-2 lg:grid-cols-2">
                  <AppInput
                    v-model="passwordResetForm.password"
                    :label="t('auth.recover_new_pwd')"
                    type="password"
                    placeholder="********"
                  />
                  <AppInput
                    v-model="passwordResetForm.confirmPassword"
                    :label="t('auth.recover_confirm_pwd')"
                    type="password"
                    placeholder="********"
                  />
                </div>

                <p class="text-[12px] text-text-dim mb-4">
                  {{ passwordRequirementsText }}
                </p>

                <AppButton :loading="updatingPassword" @click="handleUpdatePassword">
                  {{ t('auth.recover_save_pwd') }}
                </AppButton>
              </div>
            </div>
          </div>

          <!-- Success Screen -->
          <div v-if="resetStep === 'completed'" class="text-center py-6">
            <span class="material-symbols-outlined text-green-500 text-5xl mb-4">check_circle</span>
            <h4 class="text-text font-head font-bold text-xl mb-2">{{ t('auth.recover_success_title') }}</h4>
            <p class="text-text-muted text-[13px] mb-6">{{ t('auth.recover_success_desc') }}</p>
           <NuxtLink  to="/login" >
            <AppButton variant="primary" class="w-full">
              {{ t('auth.recover_go_login') }}
            </AppButton>
           </NuxtLink>
          </div>
        </div>
      </div>
    </div>
</template>