<template>
  <div class="layout h-screen flex">
    <SideBar />
    <div class="flex-1 flex flex-col min-h-0 min-w-0">
      <TopBar />
      <main class="main flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[var(--bg)]-bg">
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

@media (max-width: 767px) {
  .main {
    padding: 20px 16px 24px;
  }
}
</style>
