<template>
  <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
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
        class="pointer-events-auto flex items-start gap-3 p-4 bg-dark-bg3/90 backdrop-blur-md border border-border/50 rounded-lg shadow-2xl relative overflow-hidden group"
        :class="typeClasses(toast.type)"
      >
        <!-- Accent line -->
        <div class="absolute inset-y-0 left-0 w-1" :class="accentBg(toast.type)"></div>
        
        <!-- Icon -->
        <div class="material-symbols-outlined shrink-0 text-[20px] mt-0.5" :class="accentText(toast.type)">
          <span v-if="toast.type === 'success'">check_circle</span>
          <span v-else-if="toast.type === 'error'">cancel</span>
          <span v-else-if="toast.type === 'warning'">warning</span>
          <span v-else>info</span>
        </div>

        <!-- Content -->
        <div class="flex-1">
          <p class="text-[13px] leading-relaxed text-text font-medium">{{ toast.message }}</p>
        </div>

        <!-- Close button -->
        <button 
          @click="remove(toast.id)"
          class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded flex items-center justify-center"
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
    case 'error': return 'border-red/20 shadow-red/5'
    case 'success': return 'border-green/20 shadow-green/5'
    case 'warning': return 'border-amber/20 shadow-amber/5'
    default: return 'border-blue/20 shadow-blue/5'
  }
}

const accentBg = (type: string) => {
  switch (type) {
    case 'error': return 'bg-red'
    case 'success': return 'bg-green'
    case 'warning': return 'bg-amber'
    default: return 'bg-blue'
  }
}

const accentText = (type: string) => {
  switch (type) {
    case 'error': return 'text-red'
    case 'success': return 'text-green'
    case 'warning': return 'text-amber'
    default: return 'text-blue'
  }
}
</script>

<style scoped>
.toast-move {
  transition: all 0.4s ease;
}
</style>
