<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="modal-backdrop absolute inset-0" @click="$emit('close')"></div>

      <div class="modal-panel relative w-full max-w-md rounded-xl p-8 overflow-hidden">
        <h2 class="text-xl font-bold mb-4 font-head tracking-tight text-text">
          <slot name="title">Confirmación</slot>
        </h2>

        <div class="mb-8 text-[14px] text-text-muted leading-relaxed">
          <slot>¿Estás seguro de realizar esta acción?</slot>
        </div>

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
.modal-backdrop {
  background: var(--overlay);
  backdrop-filter: blur(10px);
}

.modal-panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-soft);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-panel {
  animation: modal-in 0.3s ease-out;
}

.modal-leave-active .modal-panel {
  animation: modal-in 0.2s ease-in reverse;
}

@keyframes modal-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
