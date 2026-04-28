<template>
  <div
    class="help-group"
    @mouseenter="showHelp = true"
    @mouseleave="showHelp = false"
  >
    <button
      type="button"
      class="help-link"
      :aria-label="`Ayuda sobre ${currentSectionHelp.title}`"
      @focus="showHelp = true"
      @blur="showHelp = false"
      @click.stop="showHelp = !showHelp"
    >
      <span class="material-symbols-outlined hover:text-amber text-[10px] translate-y-[-3px] p-1">help</span>
    </button>

    <div v-if="showHelp" class="help-tooltip" @click.stop>
      <div class="help-kicker">{{ $t('sidebar.helper.current_section') }}</div>
      <div class="help-title">{{ currentSectionHelp.title }}</div>
      <p class="help-copy">{{ currentSectionHelp.description }}</p>
      <p class="help-tip">{{ currentSectionHelp.tip }}</p>
      
      <div class="help-actions mt-4 pt-4 border-t border-amber/10">
        <button @click="requestSidebarTour(); showHelp = false" class="text-[11px] text-amber font-bold flex items-center gap-2 hover:underline">
          <span class="material-symbols-outlined text-[14px]">map</span>
          {{ $t('sidebar.helper.view_tour') }}
        </button>
      </div>
      
      <button @click="showHelp = false" class="absolute top-4 right-4 text-text-dim hover:text-text sm:hidden">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { currentSectionHelp, requestSidebarTour } = useNavigationHelp()
const showHelp = ref(false)

// Close on click outside
if (process.client) {
  onMounted(() => {
    window.addEventListener('click', () => {
      showHelp.value = false
    })
  })
}
</script>

<style scoped>
/* Individual styles if needed, but the main ones are in main.css */
.help-group {
  display: inline-flex;
  vertical-align: middle;
}
</style>
