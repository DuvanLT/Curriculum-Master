<template>
  <button 
    class="btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded font-body text-[13px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      variant === 'primary' ? 'btn-primary bg-amber text-black hover:bg-amber-light' : '',
      variant === 'ghost' ? 'btn-ghost bg-transparent text-text-muted border border-border hover:border-border-muted hover:text-text' : '',
      variant === 'danger' ? 'btn-danger bg-transparent text-red border border-red text-[12px] px-2.5 py-1.5' : '',
      size === 'sm' ? 'px-3 py-1.5 text-[12px]' : ''
    ]"
    :disabled="disabled || loading"
    @click="$emit('click')"
  >
    <div v-if="loading" class="spinner-sm mr-2"></div>
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: Boolean,
  loading: Boolean
})
defineEmits(['click'])
</script>

<style scoped>
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all .15s;
  font-family: var(--font-body);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary { background: var(--amber); color: #000; }
.btn-primary:hover { background: var(--amber2); }
.btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border); }
.btn-ghost:hover { border-color: var(--border2); color: var(--text); }
.btn-danger { background: transparent; color: var(--red); border: 1px solid var(--red); font-size: 12px; padding: 5px 10px; }
.btn-sm { padding: 5px 12px; font-size: 12px; }

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0,0,0,0.2);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
