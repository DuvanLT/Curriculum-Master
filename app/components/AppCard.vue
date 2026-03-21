<template>
  <div class="card bg-[var(--bg)] border border-border rounded-md p-5 mb-4">
    <div v-if="title" class="card-title font-head text-[14px] font-semibold mb-4 text-text flex items-center gap-2">
      <span class="w-[3px] h-[14px] bg-amber rounded-sm"></span>
      {{ title }}
      <slot name="title-action" />
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: String
})
</script>

<style scoped>
.card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 16px;
}
.card-title {
  font-family: var(--font-head);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
