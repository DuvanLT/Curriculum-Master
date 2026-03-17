<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm" @click="$emit('close')"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-dark-bg2 border border-border rounded-xl p-8 w-full max-w-md shadow-2xl overflow-hidden">
        <!-- Title -->
        <h2 class="text-xl font-bold mb-4 font-head tracking-tight text-text">
          <slot name="title">Confirmación</slot>
        </h2>
        
        <!-- Body -->
        <div class="mb-8 text-[14px] text-text-muted leading-relaxed">
          <slot>¿Estás seguro de realizar esta acción?</slot>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <AppButton class="flex-1" variant="secondary" @click="$emit('close')">
            {{ cancelText }}
          </AppButton>
          <AppButton class="flex-1" :variant="confirmVariant" @click="$emit('confirm')" :loading="loading">
            {{ confirmText }}
          </AppButton>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps({
  show: Boolean,
  loading: Boolean,
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  confirmVariant: { type: String as any, default: 'primary' }
})

defineEmits(['close', 'confirm'])
</script>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative {
  animation: modal-in 0.3s ease-out;
}
.modal-leave-active .relative {
  animation: modal-in 0.2s ease-in reverse;
}

@keyframes modal-in {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
