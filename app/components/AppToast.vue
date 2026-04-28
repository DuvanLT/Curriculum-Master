<template>
  <div class="fixed top-4 right-4 sm:top-6 sm:right-6 z-[9999] flex flex-col gap-2 sm:gap-3 pointer-events-none w-[calc(100%-32px)] sm:max-w-sm sm:w-full">
    <TransitionGroup
      name="toast"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-x-12 opacity-0"
      enter-to-class="transform translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-x-0 opacity-100"
      leave-to-class="transform translate-x-12 opacity-0"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-card pointer-events-auto flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border border-border/50 rounded-lg relative overflow-hidden group"
        :class="typeClasses(toast.type)"
      >
        <div class="absolute inset-y-0 left-0 w-1" :class="accentBg(toast.type)"></div>

        <div class="material-symbols-outlined shrink-0 text-[18px] sm:text-[20px] mt-0.5" :class="accentText(toast.type)">
          <span v-if="toast.type === 'success'">check_circle</span>
          <span v-else-if="toast.type === 'error'">cancel</span>
          <span v-else-if="toast.type === 'warning'">warning</span>
          <span v-else>info</span>
        </div>

        <div class="flex-1">
          <p class="text-[12px] sm:text-[13px] leading-relaxed text-text font-medium">{{ toast.message }}</p>
        </div>

        <button
          @click="remove(toast.id)"
          class="toast-close shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded flex items-center justify-center"
        >
          <span class="material-symbols-outlined text-[14px] text-text-dim">close</span>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
const { toasts, remove } = useToast()

const typeClasses = (type: string) => {
  switch (type) {
    case 'error':
      return 'border-red/20 shadow-red/5'
    case 'success':
      return 'border-green/20 shadow-green/5'
    case 'warning':
      return 'border-amber/20 shadow-amber/5'
    default:
      return 'border-blue/20 shadow-blue/5'
  }
}

const accentBg = (type: string) => {
  switch (type) {
    case 'error':
      return 'bg-red'
    case 'success':
      return 'bg-green'
    case 'warning':
      return 'bg-amber'
    default:
      return 'bg-blue'
  }
}

const accentText = (type: string) => {
  switch (type) {
    case 'error':
      return 'text-red'
    case 'success':
      return 'text-green'
    case 'warning':
      return 'text-amber'
    default:
      return 'text-blue'
  }
}
</script>

<style scoped>
.toast-card {
  background: color-mix(in srgb, var(--bg2) 92%, transparent);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-soft);
}

.toast-close:hover {
  background: var(--bg4);
}

.toast-move {
  transition: all 0.4s ease;
}
</style>
