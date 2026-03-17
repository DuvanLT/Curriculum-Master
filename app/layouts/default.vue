<template>
  <div class="layout h-screen flex">
    <SideBar />
    <div class="flex-1 flex flex-col min-h-0">
      <TopBar />
      <main class="main flex-1 overflow-y-auto p-6 bg-dark-bg">
        <slot />
      </main>
    </div>
    <AppToast />
  </div>
</template>

<script setup>
</script>

<style scoped>
.layout {
  display: flex;
  flex: 1;
}
.main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--bg);
}
</style>
