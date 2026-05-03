<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('settings.title') }}</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('settings.subtitle') }}</div>

      <div class="flex gap-4 mb-6 border-b border-border/50">
        <button
          @click="activeTab = 'session'"
          class="pb-2 text-[13px] font-mono transition-all relative"
          :class="activeTab === 'session' ? 'text-amber' : 'text-text-dim hover:text-text'"
        >
          {{ $t('settings.tab_session') }}
          <div v-if="activeTab === 'session'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber"></div>
        </button>
        <button
          @click="activeTab = 'privacy'"
          class="pb-2 text-[13px] font-mono transition-all relative"
          :class="activeTab === 'privacy' ? 'text-amber' : 'text-text-dim hover:text-text'"
        >
          {{ $t('settings.tab_privacy') }}
          <div v-if="activeTab === 'privacy'" class="absolute bottom-0 left-0 right-0 h-0.5 bg-amber"></div>
        </button>
      </div>

      <div v-if="activeTab === 'session'">
        <AppCard :title="$t('settings.session_management_title')">
          <p class="text-[13px] text-text-muted mb-4">
            {{ $t('settings.session_logged_in_as') }}<strong class="text-text">{{ user?.email }}</strong>.
          </p>
          <AppButton variant="secondary" :loading="loggingOut" @click="handleLogout">
            <span class="material-symbols-outlined text-[18px] mr-2">logout</span>
            {{ $t('settings.session_logout_btn') }}
          </AppButton>
        </AppCard>

        <AppCard :title="$t('settings.lang_pref_title')" class="mt-4">
          <p class="text-[13px] text-text-muted mb-4">
            {{ $t('settings.lang_pref_subtitle') }}
          </p>
          <div class="max-w-xs relative">
            <select
              :value="currentLocale"
              @change="setPreferredLocale(($event.target as HTMLSelectElement).value as 'es' | 'en')"
              class="w-full bg-[var(--bg)]-bg border border-border focus:border-amber outline-none rounded-lg py-2.5 pl-3 pr-10 text-[13px] text-text transition-all appearance-none cursor-pointer"
            >
              <option value="es">Español (ES)</option>
              <option value="en">English (EN)</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-dim">
              <span class="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
          </div>
        </AppCard>
      </div>

      <div v-else-if="activeTab === 'privacy'">
        <AppCard :title="$t('settings.privacy_data_title')">
          <div class="space-y-6">
            <div class="border border-border/60 bg-[var(--bg)]-bg3/50 rounded-xl p-6">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div class="flex items-center gap-3 mb-3">
                    <span class="material-symbols-outlined text-amber">lock_reset</span>
                    <h3 class="text-text font-head font-bold text-lg">{{ $t('settings.reset_pwd_title') }}</h3>
                  </div>
                  <p class="text-[13px] text-text-muted max-w-2xl">
                    {{ $t('settings.reset_pwd_desc') }}<strong class="text-text">{{ user?.email }}</strong>{{ $t('settings.reset_pwd_desc_2') }}
                  </p>
                </div>

                <AppButton
                  variant="primary"
                  :loading="requestingPasswordResetCode"
                  @click="handleRequestPasswordResetCode"
                >
                  {{ resetStep === 'idle' ? $t('settings.reset_pwd_btn') : $t('settings.resend_code_btn') }}
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
                    {{ $t('settings.reset_code_label') }}
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
                      {{ $t('settings.verify_code_btn') }}
                    </AppButton>
                  </div>

                  <p class="text-[12px] text-text-dim mt-2">
                    {{ $t('settings.reset_code_expires') }}
                  </p>
                </div>

                <div v-if="resetStep === 'verified'" class="border border-amber/20 bg-amber/5 rounded-xl p-5">
                  <div class="flex items-center gap-2 text-amber mb-4">
                    <span class="material-symbols-outlined text-[18px]">verified</span>
                    <p class="text-[13px] font-medium">{{ $t('settings.code_verified') }}</p>
                  </div>

                  <div class="grid gap-2 lg:grid-cols-2">
                    <AppInput
                      v-model="passwordResetForm.password"
                      :label="$t('settings.new_pwd_label')"
                      type="password"
                      placeholder="********"
                    />
                    <AppInput
                      v-model="passwordResetForm.confirmPassword"
                      :label="$t('settings.confirm_pwd_label')"
                      type="password"
                      placeholder="********"
                    />
                  </div>

                  <p class="text-[12px] text-text-dim mb-4">
                    {{ passwordRequirementsText }}
                  </p>

                  <AppButton :loading="updatingPassword" @click="handleUpdatePassword">
                    {{ $t('settings.save_new_pwd_btn') }}
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-red-500">warning</span>
                <h3 class="text-red-500 font-head font-bold text-lg">{{ $t('settings.danger_zone_title') }}</h3>
              </div>
              <p class="text-[13px] text-text-muted mb-6">
                {{ $t('settings.danger_zone_desc') }}
              </p>
              <AppButton
                variant="secondary"
                class="!border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-text-dim transition-all"
                @click="showDeleteModal = true"
              >
                {{ $t('settings.delete_account_btn') }}
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
              <h2 class="text-xl font-bold mb-1 font-head tracking-tight text-text">{{ $t('settings.churn_title') }}</h2>
              <p class="text-[13px] text-text-dim mb-6">{{ $t('settings.churn_subtitle') }}</p>

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
                  :placeholder="$t('settings.churn_placeholder')"
                  rows="2"
                  class="churn-textarea w-full"
                ></textarea>
              </div>

              <div class="flex gap-3">
                <AppButton class="flex-1" variant="secondary" @click="closeDeleteModal">{{ $t('settings.churn_cancel') }}</AppButton>
                <AppButton class="flex-1" variant="primary" :disabled="!churnReason" @click="deleteStep = 2">{{ $t('settings.churn_continue') }}</AppButton>
              </div>
            </div>

            <!-- Step 2: Final Confirm -->
            <div v-else-if="deleteStep === 2">
              <div class="flex items-center gap-3 mb-4">
                <span class="material-symbols-outlined text-red-500 text-3xl">warning</span>
                <h2 class="text-xl font-bold font-head tracking-tight text-red-500">{{ $t('settings.churn_final_title') }}</h2>
              </div>
              <p class="text-[13px] text-text-muted mb-6 leading-relaxed">
                {{ $t('settings.churn_final_desc') }}
              </p>
              <div class="flex gap-3">
                <AppButton class="flex-1" variant="secondary" @click="deleteStep = 1">{{ $t('settings.churn_back') }}</AppButton>
                <AppButton
                  class="flex-1 !border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-white"
                  variant="secondary"
                  :loading="deletingAccount"
                  @click="handleDeleteAccount"
                >
                  {{ $t('settings.churn_confirm') }}
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
const { locale, setLocale, t } = useI18n()

const currentLocale = computed(() => locale.value)
const setPreferredLocale = async (newLocale: 'es' | 'en') => {
  setLocale(newLocale)
  localStorage.setItem('preferred-locale', newLocale)
  toast.success(t('settings.toast_lang_saved'))
  // Persist to DB so it's available on login from any device
  try {
    await $fetch('/api/profile/locale', {
      method: 'POST',
      body: { locale: newLocale }
    })
  } catch (e) {
    console.error('Could not save locale to server:', e)
  }
}

const activeTab = ref('session')
const showDeleteModal = ref(false)
const deleteStep = ref(1)
const churnReason = ref('')
const churnComment = ref('')
const deletingAccount = ref(false)

const churnReasons = computed(() => [
  { value: 'no_lo_necesito', label: t('settings.churn_reason_no_need'), icon: 'check_circle' },
  { value: 'falta_funciones', label: t('settings.churn_reason_missing_features'), icon: 'build' },
  { value: 'dificil_de_usar', label: t('settings.churn_reason_hard_to_use'), icon: 'sentiment_dissatisfied' },
  { value: 'encontre_alternativa', label: t('settings.churn_reason_alternative'), icon: 'swap_horiz' },
  { value: 'privacidad', label: t('settings.churn_reason_privacy'), icon: 'shield' },
  { value: 'otro', label: t('settings.churn_reason_other'), icon: 'more_horiz' },
])

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
        action: 'request-code',
        locale: locale.value
      }
    })

    resetStep.value = 'code-sent'
    clearResetForm()
    setResetFeedback(t('settings.toast_code_sent'), 'success')
    toast.success(t('settings.toast_check_email'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('settings.toast_code_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('settings.toast_code_error'))
  } finally {
    requestingPasswordResetCode.value = false
  }
}

const handleVerifyPasswordResetCode = async () => {
  if (resetCode.value.length !== 6) {
    setResetFeedback(t('settings.toast_code_length'), 'error')
    return
  }

  verifyingPasswordResetCode.value = true
  resetFeedback.value = ''

  try {
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: {
        action: 'verify-code',
        code: resetCode.value,
        locale: locale.value
      }
    })

    resetStep.value = 'verified'
    setResetFeedback(t('settings.toast_code_verified'), 'success')
    toast.success(t('settings.toast_can_set_pwd'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('settings.toast_code_verify_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('settings.toast_code_verify_error'))
  } finally {
    verifyingPasswordResetCode.value = false
  }
}

const handleUpdatePassword = async () => {
  if (passwordResetForm.value.password !== passwordResetForm.value.confirmPassword) {
    setResetFeedback(t('settings.toast_pwd_mismatch'), 'error')
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
        confirmPassword: passwordResetForm.value.confirmPassword,
        locale: locale.value
      }
    })

    resetStep.value = 'idle'
    clearResetForm()
    setResetFeedback(t('settings.toast_pwd_updated'), 'success')
    toast.success(t('settings.toast_pwd_updated'))
  } catch (e: any) {
    console.error(e)
    setResetFeedback(e.data?.statusMessage || e.message || t('settings.toast_pwd_update_error'), 'error')
    toast.error(e.data?.statusMessage || e.message || t('settings.toast_pwd_update_error'))
  } finally {
    updatingPassword.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    await navigateTo('/login', { replace: true })
  } catch (e) {
    toast.error(t('settings.toast_logout_error'))
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
    toast.error(t('settings.toast_delete_error', { error: e.statusMessage || e.message }))
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
