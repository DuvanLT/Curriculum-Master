<template>
  <header class="topbar flex items-center justify-between px-6 h-[52px] bg-dark-bg2 border-b border-border flex-shrink-0">
    <div class="flex items-center">
      <div class="logo font-head text-lg font-bold tracking-tighter text-text">
        ATS<span>-MASTER</span>
      </div>
      <span class="logo-tag font-mono text-[10px] text-text-dim ml-2 bg-dark-bg4 border border-border px-1.5 py-0.5 rounded">v2.0-AI</span>
    </div>
   <div class="flex items-center">
  <button 
    @click="logout" 
    class="group flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium text-text-dim cursor-pointer transition-all duration-200 hover:bg-red-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-200"
    aria-label="Cerrar sesión"
  >
    <span class="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">
      logout
    </span>
    <span>Cerrar Sesión</span>
  </button>
</div>
  </header>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const { logout } = useAuth()
</script>

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
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
}
</style>
