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
      @click="requestSidebarTour"
    >
      <span class="material-symbols-outlined hover:text-amber text-[10px] translate-y-[-3px] p-1">help</span>
    </button>

    <div v-show="showHelp" class="help-tooltip">
      <div class="help-kicker">Seccion actual</div>
      <div class="help-title">{{ currentSectionHelp.title }}</div>
      <p class="help-copy">{{ currentSectionHelp.description }}</p>
      <p class="help-tip">{{ currentSectionHelp.tip }}</p>
      <div class="help-footnote">Haz click en Ayuda para volver a ver el recorrido del sidebar.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { currentSectionHelp, requestSidebarTour } = useNavigationHelp()
const showHelp = ref(false)
</script>

<style scoped>
/* Individual styles if needed, but the main ones are in main.css */
.help-group {
  display: inline-flex;
  vertical-align: middle;
}
</style>
