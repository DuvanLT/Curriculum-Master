<template>
  <header class="topbar flex items-center justify-between px-6 h-[52px] bg-[var(--bg)]-bg2 border-b border-border flex-shrink-0">
    <div class="flex items-center">
      <div class="logo font-head text-lg font-bold tracking-tighter text-text">
        Bring<span>Jobs</span>
      </div>
      <span class="logo-tag font-mono text-[10px] text-text-dim ml-2 bg-[var(--bg)]-bg4 border border-border px-1.5 py-0.5 rounded">v0.0.1</span>
    </div>

    <div class="topbar-actions">
    </div>
  </header>
</template>



<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo {
  font-family: var(--font-head);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
}

.logo span {
  color: var(--amber);
}

.logo-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  margin-left: 8px;
  background: var(--bg4);
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 3px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

@media (max-width: 767px) {
  .topbar {
    padding: 0 16px 0 20px;
  }

  .logo {
    font-size: 16px;
  }

  .logo-tag {
    display: none;
  }
}

</style>
