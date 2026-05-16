<template>
  <div class="exp-item border border-border rounded-[5px] p-[14px] mb-2.5 bg-[var(--bg)]-bg3 relative group">
    <div class="flex items-center gap-2 mb-2">
      <span class="px-2 py-0.5 rounded-[999px] text-[10px] font-mono uppercase tracking-wider" :class="badgeClass">
        {{ typeLabel }}
      </span>
    </div>

    <div class="exp-header flex justify-between items-start mb-2 mt-2">
      <div>
        <div class="exp-role font-medium text-[14px] text-text">{{ experience.cargo }}</div>
        <div class="exp-company text-[12px] text-amber font-mono">{{ experience.empresa }}</div>
      </div>
      <div class="text-right">
        <div class="exp-dates text-[11px] text-text-dim font-mono">{{ experience.inicio }} -> {{ experience.fin || 'Actual' }}</div>
        <div class="flex gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end">
          <AppButton variant="secondary" size="sm" @click="$emit('edit', experience)">Editar</AppButton>
          <AppButton variant="danger" size="sm" @click="$emit('remove', experience.id)">Eliminar</AppButton>
        </div>
      </div>
    </div>

    <div v-if="experience.descripcion" class="text-[12px] text-text-dim mb-2">{{ experience.descripcion }}</div>

    <div v-if="experience.logros" class="text-[12px] text-text-muted mb-2 italic">
      <div v-for="(line, index) in achievementLines" :key="index" v-show="line.trim()">
        - {{ line }}
      </div>
    </div>

    <div class="keyword-grid flex flex-wrap gap-1.5 mt-2">
      <span v-for="skill in experience.skills" :key="skill" class="tag tag-amber px-2 py-0.5 rounded-[3px] text-[11px] font-mono bg-amber-dim text-amber">
        {{ skill }}
      </span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  experience: {
    type: Object,
    required: true
  }
})

defineEmits(['remove', 'edit'])

const typeLabel = computed(() => {
  return props.experience?.type === 'project' ? 'Proyecto' : 'Laboral'
})

const badgeClass = computed(() => {
  return props.experience?.type === 'project'
    ? 'text-violet-500 bg-violet-100'
    : 'bg-amber-dim text-amber border border-amber-dim'
})

const achievementLines = computed(() => {
  if (!props.experience?.logros || typeof props.experience.logros !== 'string') return []
  return props.experience.logros.split('\n')
})
</script>

<style scoped>
.exp-item {
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 14px;
  margin-bottom: 10px;
  background: var(--bg3);
  position: relative;
}
.exp-role {
  font-weight: 500;
  font-size: 14px;
  color: var(--text);
}
.exp-company {
  font-size: 12px;
  color: var(--amber);
  font-family: var(--font-mono);
}
.exp-dates {
  font-size: 11px;
  color: var(--text3);
  font-family: var(--font-mono);
}
</style>
