<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Ajustes</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">Configura tu cuenta y gestiona tus preferencias.</div>

      <!-- Tabs Header -->
      <div class="flex gap-4 mb-6 border-b border-border/50">
        <button 
          @click="activeTab = 'session'" 
          class="pb-2 text-[13px] font-mono transition-all relative"
          :class="activeTab === 'session' ? 'text-amber' : 'text-text-dim hover:text-text'"
        >
          Sesión
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

      <!-- Tab Content: Session -->
      <div v-if="activeTab === 'session'">
        <AppCard title="Gestión de Sesión">
          <p class="text-[13px] text-text-muted mb-4">
            Has iniciado sesión como <strong class="text-text">{{ user?.email }}</strong>.
          </p>
          <AppButton variant="secondary" @click="handleLogout">
            <span class="material-symbols-outlined text-[18px] mr-2">logout</span>
            Cerrar sesión en este dispositivo
          </AppButton>
        </AppCard>
      </div>

      <!-- Tab Content: Privacy -->
      <div v-else-if="activeTab === 'privacy'">
        <AppCard title="Privacidad y Datos">
          <div class="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
            <div class="flex items-center gap-3 mb-4">
              <span class="material-symbols-outlined text-red-500">warning</span>
              <h3 class="text-red-500 font-head font-bold text-lg">Zona de Peligro</h3>
            </div>
            <p class="text-[13px] text-text-muted mb-6">
              Al eliminar tu cuenta, todos tus registros (experiencias, aplicaciones, retos y análisis) serán borrados permanentemente. Esta acción no se puede deshacer.
            </p>
            <AppButton 
              variant="secondary" 
              class="!border-red-500/30 !text-red-500 hover:!bg-red-500 hover:!text-white transition-all"
              @click="showDeleteModal = true"
            >
              Borrar mi cuenta definitivamente
            </AppButton>
          </div>
        </AppCard>
      </div>

      <!-- Delete Confirmation Modal -->
      <AppModal
        :show="showDeleteModal"
        :loading="deletingAccount"
        title="Eliminar Cuenta"
        confirm-text="Si, eliminar permanentemente"
        cancel-text="Cancelar"
        confirm-variant="primary"
        @close="showDeleteModal = false"
        @confirm="handleDeleteAccount"
      >
        <p>¿Estás absolutamente seguro? Todos tus datos serán eliminados de nuestros servidores para siempre.</p>
      </AppModal>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useAuth()
const toast = useToast()

const activeTab = ref('session')
const showDeleteModal = ref(false)
const deletingAccount = ref(false)

const handleLogout = async () => {
  try {
    await logout()
    toast.success('Sesión cerrada correctamente')
    await navigateTo('/login')
  } catch (e) {
    toast.error('Error al cerrar sesión')
  }
}

const handleDeleteAccount = async () => {
  deletingAccount.value = true
  try {
    await $fetch<any>('/api/profile', {
      method: 'DELETE'
    })
    
    toast.success('Cuenta eliminada. Adiós.')
    
    // Clear session and redirect
    await logout()
    await navigateTo('/login')
  } catch (e: any) {
    console.error(e)
    toast.error('Error al intentar eliminar la cuenta: ' + (e.statusMessage || e.message))
  } finally {
    deletingAccount.value = false
    showDeleteModal.value = false
  }
}
</script>
