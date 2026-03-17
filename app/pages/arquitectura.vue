<template>
  <NuxtLayout>
    <div>
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Arquitectura de Datos</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">// SQLite schema · Turso DB compatible</div>

      <div class="bg-dark-bg3 border border-border rounded-[5px] p-3 text-[12px] text-text-muted leading-relaxed mb-4">
        <strong class="text-amber">Diseño relacional:</strong> Un usuario tiene N experiencias, puede crear N vacantes y generar N CVs por vacante. El perfil maestro actúa como <strong>Single Source of Truth</strong>.
      </div>

      <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
        <AppButton 
          v-for="t in Object.keys(DB_SCHEMA)" 
          :key="t" 
          :variant="activeTab === t ? 'primary' : 'ghost'" 
          size="sm"
          @click="activeTab = t"
        >
          {{ t }}
        </AppButton>
      </div>

      <AppCard>
        <template #title-action>
          <div class="ml-auto flex items-center gap-2">
            <span class="text-text-dim font-mono text-[13px]">TABLE:</span>
            <span class="text-amber font-mono text-[13px]">{{ activeTab.toUpperCase() }}</span>
            <span class="bg-dark-bg4 text-text-dim border border-border px-2 py-0.5 rounded-[3px] text-[10px] font-mono">
              {{ DB_SCHEMA[activeTab].length }} columnas
            </span>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-[12px] font-mono">
            <thead>
              <tr class="bg-dark-bg4 text-text-dim">
                <th class="border border-border p-2 text-left font-medium">Columna</th>
                <th class="border border-border p-2 text-left font-medium">Tipo</th>
                <th class="border border-border p-2 text-left font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in DB_SCHEMA[activeTab]" :key="row.col">
                <td class="border border-border p-2 text-amber">
                  {{ row.col }}
                  <span v-if="row.notes.includes('PK')" class="text-green text-[10px] ml-1">★ PK</span>
                </td>
                <td class="border border-border p-2 text-blue">{{ row.type }}</td>
                <td class="border border-border p-2 text-text-dim font-sans italic">
                  <span v-if="row.notes.includes('FK')" class="text-text-muted font-mono non-italic">
                    ⇒ {{ row.notes.replace('FK → ', '') }}
                  </span>
                  <span v-else>{{ row.notes }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 font-mono text-[11px]">
          <div class="text-text-muted mb-2 font-mono">// CREATE TABLE statement</div>
          <div class="bg-dark-bg4 p-3 rounded-[4px] text-text-muted leading-relaxed whitespace-pre">
CREATE TABLE IF NOT EXISTS {{ activeTab }} (
{{ DB_SCHEMA[activeTab].map(r => `  ${r.col} ${r.type}${r.notes ? ' -- ' + r.notes : ''}`).join('\n') }}
);
          </div>
        </div>
      </AppCard>

      <AppCard title="System Prompts de IA">
        <div class="flex gap-2 mb-3">
          <AppButton v-for="title in promptTabs" :key="title.key" variant="ghost" size="sm" @click="scrollTo(title.key)">
            {{ title.label }}
          </AppButton>
        </div>
        <div v-for="(v, k) in SYSTEM_PROMPTS" :key="k" :id="'sp_' + k" class="mb-5 last:mb-0">
          <div class="font-mono text-[11px] text-amber mb-1.5 uppercase tracking-widest tracking-tighter">▸ SYSTEM_PROMPT :: {{ k }}</div>
          <div class="bg-dark-bg3 border border-amber-dim border-l-[3px] border-l-amber rounded-r-[5px] p-3.5 text-[12px] font-mono text-text-muted leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">
            {{ v }}
          </div>
        </div>
      </AppCard>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})
import { DB_SCHEMA, SYSTEM_PROMPTS } from '~/utils/constants'

const activeTab = ref('usuarios')
const promptTabs = [
  { key: 'analyzer', label: '🔍 Analizador' },
  { key: 'cv_generator', label: '📄 CV Gen' },
  { key: 'chatbot', label: '💬 Chatbot' }
]

const scrollTo = (id) => {
  const el = document.getElementById('sp_' + id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
th, td {
  border: 1px solid var(--border);
}
</style>
