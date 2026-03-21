<template>
  <button
    class="btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded font-body text-[13px] font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      variant === 'primary' ? 'btn-primary' : '',
      variant === 'secondary' ? 'btn-secondary' : '',
      variant === 'warning' ? 'btn-warning' : '',
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
  border: 1px solid transparent;
  transition: all .15s;
  font-family: var(--font-body);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: var(--amber);
  color: #fff;
  box-shadow: var(--shadow-soft);
}

.btn-primary:hover {
  background: var(--amber2);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--bg3);
  color: var(--text);
  border-color: var(--border);
}

.btn-secondary:hover {
  background: var(--bg4);
  border-color: var(--border2);
}

.btn-warning {
  background: var(--amber2);
  color: #fff;
  box-shadow: var(--shadow-soft);
}

.btn-warning:hover {
  background: var(--amber);
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: var(--text2);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  border-color: var(--border2);
  color: var(--text);
}

.btn-danger {
  background: transparent;
  color: var(--red);
  border: 1px solid var(--red);
  font-size: 12px;
  padding: 5px 10px;
}

.btn-sm {
  padding: 5px 12px;
  font-size: 12px;
}

.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, currentColor 20%, transparent);
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
