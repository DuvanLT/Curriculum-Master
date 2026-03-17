<template>
  <NuxtLayout>
    <div class="h-full flex flex-col">
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Ezra AI</div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">// Career strategy · Mock interviews · Salary negotiation</div>

      <AppCard class="flex-1 flex flex-col min-h-0 !mb-0">
        <div class="chat-area flex-1 overflow-y-auto border border-border rounded-[5px] p-3 bg-dark-bg3 mb-2.5 flex flex-col gap-2.5 min-h-[300px]" ref="chatContainer">
          <div v-for="(msg, i) in msgs" :key="i" class="max-w-[85%] p-2.5 px-3.5 rounded-[5px] text-[13px] leading-relaxed"
            :class="msg.role === 'user' ? 'msg-user bg-amber-dim text-amber-light self-end rounded-br-none' : 'msg-ai bg-dark-bg4 text-text self-start rounded-bl-none border border-border'">
            <div class="text-[10px] font-mono text-text-dim mb-1 uppercase tracking-tighter">{{ msg.role === 'user' ? 'Tú' : 'Coach AI' }}</div>
            <div v-if="msg.role === 'user'">{{ msg.text }}</div>
            <div v-else class="markdown-content" v-html="renderMarkdown(msg.text)"></div>
          </div>
          <div v-if="loading" class="self-start bg-dark-bg4 p-3 rounded-[5px] flex gap-1 items-center">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>

        <div class="flex gap-2">
          <AppInput 
            v-model="input" 
            placeholder="Haz una pregunta sobre tu carrera..." 
            class="!mb-0 flex-1"
            @keyup.enter="send()"
          />
          <AppButton @click="send()" :disabled="loading || !input.trim()">
            Enviar
          </AppButton>
        </div>

        <div class="flex flex-wrap gap-2 mt-4">
          <button 
            v-for="s in suggestions" 
            :key="s" 
            @click="send(s)"
            class="text-[11px] font-mono text-text-dim border border-border rounded-full px-3 py-1 hover:border-amber hover:text-amber transition-colors"
          >
            {{ s }}
          </button>
        </div>
      </AppCard>
    </div>
  </NuxtLayout>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})
import { marked } from 'marked'

const { profile, experiences, fetchProfile } = useAppState()

onMounted(() => {
  fetchProfile()
})

const msgs = ref([
  { role: 'ai', text: '¡Hola! Soy Ezra. Puedo ayudarte con estrategia de búsqueda de empleo, gaps laborales, negociación salarial o preparación para entrevistas. ¿En qué trabajamos hoy?' }
])
const input = ref('')
const loading = ref(false)
const chatContainer = ref(null)

const suggestions = [
  '¿Cómo explico un gap laboral de 6 meses?',
  '¿Qué habilidades blandas resaltar en un trabajo en equipo?',
  '¿Cómo negocio mi salario?',
  '¿Cómo destaco una transición de carrera?'
]

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const send = async (text) => {
  const msg = text || input.value.trim()
  if (!msg) return
  
  if (!text) input.value = ''
  msgs.value.push({ role: 'user', text: msg })
  loading.value = true
  scrollToBottom()

  try {
    const data = await $fetch<any>('/api/coach', {
      method: 'POST',
      body: {
        messages: msgs.value,
        profile: profile.value,
        experiences: experiences.value
      }
    })
    
    msgs.value.push({ role: 'assistant', text: data.text })
  } catch (e) {
    console.error('Coach Error:', e)
    msgs.value.push({ role: 'ai', text: 'Lo siento, hubo un problema técnico al conectar con el Coach. Por favor, intenta de nuevo en un momento.' })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const renderMarkdown = (text) => {
  return marked.parse(text)
}
</script>

<style scoped>
.msg-user {
  background: var(--amber-dim);
  color: var(--amber2);
}
.msg-ai {
  background: var(--bg4);
  color: var(--text);
  border: 1px solid var(--border);
}

:deep(.markdown-content) p {
  margin-bottom: 0.75rem;
}
:deep(.markdown-content) p:last-child {
  margin-bottom: 0;
}
:deep(.markdown-content) ul, :deep(.markdown-content) ol {
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
:deep(.markdown-content) li {
  margin-bottom: 0.25rem;
}
:deep(.markdown-content) strong {
  color: var(--amber);
  font-weight: 600;
}
:deep(.markdown-content) h1, :deep(.markdown-content) h2, :deep(.markdown-content) h3 {
  font-family: var(--font-head);
  font-weight: bold;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--amber);
}
</style>
