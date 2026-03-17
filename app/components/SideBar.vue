<template>
  <nav class="sidebar w-[200px] bg-dark-bg2 border-r border-border p-4 flex-shrink-0 flex flex-col">
    <div class="nav-section mb-6">
      <div class="nav-label text-[10px] text-text-dim px-4 mb-2 tracking-widest uppercase font-mono">Principal</div>
      <NuxtLink to="/analisis" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">search</span> Analizar Vacante
      </NuxtLink>
      <NuxtLink to="/generador" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">description</span> Constructor CV
      </NuxtLink>
      <NuxtLink to="/coach" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">smart_toy</span> Ezra
      </NuxtLink>
      <NuxtLink to="/pasos" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">fact_check</span> Mi Ruta
      </NuxtLink>
      <NuxtLink to="/entrevista" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">videocam</span>
        <span class="nav-text">Practicar Entrevista</span>
        <span class="badge-beta">BETA</span>
      </NuxtLink>
      <NuxtLink to="/aplicaciones" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">view_kanban</span> Mis Aplicaciones
      </NuxtLink>
      <NuxtLink to="/ofertas" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">work</span> Bolsa de Empleo
      </NuxtLink>
    </div>

    <div class="nav-section mb-6">
      <div class="nav-label text-[10px] text-text-dim px-4 mb-2 tracking-widest uppercase font-mono">Sistema</div>
      <NuxtLink to="/arquitectura" class="nav-item" active-class="active">
        <span class="material-symbols-outlined nav-icon">settings</span> Arquitectura
      </NuxtLink>
    </div>

    <!-- User Section & Logout -->
    <div class="mt-auto pt-6 border-t border-border/50">
      <NuxtLink v-if="user" to="/perfil" class="flex items-center gap-3 px-4 mb-4 group cursor-pointer no-underline">
        <div class="w-8 h-8 rounded-full bg-amber/10 border border-amber/30 flex items-center justify-center text-amber font-bold text-[12px] shrink-0 group-hover:bg-amber/20 transition-all">
          {{ user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase() }}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="text-[11px] text-amber/80 font-mono truncate tracking-tight group-hover:text-amber transition-colors">{{ user.name || 'Sin Nombre' }}</div>
          <div class="text-[9px] text-white truncate font-mono  group-hover:opacity-100 transition-opacity">Plan Beta</div>
        </div>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup>
const { user, logout } = useAuth()
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  padding: 16px 0;
  flex-shrink: 0;
}
.nav-section {
  margin-bottom: 24px;
}
.nav-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text3);
  padding: 0 16px 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text2);
  border-left: 2px solid transparent;
  transition: all .15s;
  text-decoration: none;
}
.nav-item:hover {
  color: var(--text);
  background: var(--bg3);
}
.nav-item.active {
  color: var(--amber);
  border-left-color: var(--amber);
  background: var(--bg3);
}
.nav-icon {
  font-size: 18px;
  width: 20px;
  text-align: center;
}
.logout-btn:hover {
  color: var(--red);
}
</style>
