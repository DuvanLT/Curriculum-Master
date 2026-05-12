<template>
  <NuxtLayout>
    <div class="flex flex-col pb-10">
      <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('coach.title') }} <HelpButton /></div>
      <div class="page-sub text-[13px] text-text-dim mb-6 font-mono">{{ $t('coach.subtitle') }}</div>

      <AppCard class="flex flex-col !mb-0">
        <div class="chat-area flex-1 overflow-y-auto border border-border rounded-[5px] p-3 bg-[var(--bg)]-bg3 mb-2.5 flex flex-col gap-2.5 min-h-[300px]" ref="chatContainer">
          <div v-for="(msg, i) in msgs" :key="i" class="max-w-[85%] p-2.5 px-3.5 rounded-[5px] text-[13px] leading-relaxed"
            :class="msg.role === 'user' ? 'msg-user bg-amber-dim text-amber-light self-end rounded-br-none' : 'msg-ai bg-[var(--bg)]-bg4 text-text self-start rounded-bl-none border border-border'">
            <div class="text-[10px] font-mono text-text-dim mb-1 uppercase tracking-tighter">{{ msg.role === 'user' ? $t('coach.user_label') : $t('coach.ai_label') }}</div>
            <div v-if="msg.role === 'user'">{{ msg.text }}</div>
            <div v-else class="markdown-content" v-html="renderMarkdown(msg.text)"></div>
          </div>
          <div v-if="loading" class="self-start bg-[var(--bg)]-bg4 p-3 rounded-[5px] flex gap-1 items-center">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>

        <div class="coach-composer">
          <input
            v-model="input"
            type="text"
            :placeholder="$t('coach.placeholder')"
            class="coach-composer-input"
            @keyup.enter="handleSend()"
          />
          <button
            type="button"
            class="coach-composer-button"
            :disabled="loading || !input.trim()"
            @click="handleSend()"
          >
            <span v-if="loading" class="coach-composer-spinner" aria-hidden="true"></span>
            <span>{{ $t('coach.send') }}</span>
          </button>
        </div>

        <div v-if="user?.subscription_name === 'pro'" class="flex flex-col sm:flex-row flex-wrap gap-2 mt-4">
          <button 
            v-for="s in suggestions" 
            :key="s" 
            @click="send(s)"
            class="text-[11px] font-mono text-text-dim border border-border rounded-lg sm:rounded-full px-4 py-1.5 hover:border-amber hover:text-amber transition-all text-left w-full sm:w-auto whitespace-normal leading-tight"
          >
            {{ s }}
          </button>
        </div>
      </AppCard>
    </div>
  </NuxtLayout>
</template>

<script setup>
// Removed redundant middleware: auth (now global)

const { user } = useAuth()
const { showUpgradeModal } = useSubscription()
const { profile, experiences, fetchProfile } = useAppState()
const { t, locale } = useI18n()

onMounted(() => {
  fetchProfile()
})

const msgs = ref([
  { role: 'ai', text: t('coach.welcome') }
])

// Update welcome message when locale changes
watch(locale, () => {
  if (msgs.value.length > 0 && msgs.value[0].role === 'ai') {
    msgs.value[0].text = t('coach.welcome')
  }
})
const input = ref('')
const loading = ref(false)
const chatContainer = ref(null)

const suggestions = computed(() => [
  t('coach.suggestion_gap'),
  t('coach.suggestion_soft_skills'),
  t('coach.suggestion_salary'),
  t('coach.suggestion_transition')
])

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const handleSend = (text) => {
  if (user.value?.subscription_name !== 'pro') {
    showUpgradeModal.value = true
    return
  }
  send(text)
}

const send = async (text) => {
  const msg = text || input.value.trim()
  if (!msg) return
  
  if (!text) input.value = ''
  msgs.value.push({ role: 'user', text: msg })
  loading.value = true
  scrollToBottom()

  try {
    const data = await $fetch('/api/coach', {
      method: 'POST',
      body: {
        messages: msgs.value,
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    
    msgs.value.push({ role: 'assistant', text: data.text })
  } catch (e) {
    console.error('Coach Error:', e)
    msgs.value.push({ role: 'ai', text: t('coach.error') })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const renderMarkdown = (text) => {
  return renderSafeMarkdown(text)
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

.coach-composer {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-top: 2px;
}

.coach-composer-input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--amber) 55%, var(--border));
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg) 90%, white 10%), var(--bg));
  color: var(--text);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.coach-composer-input::placeholder {
  color: var(--text-dim);
}

.coach-composer-input:focus {
  border-color: var(--amber);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--amber) 18%, transparent);
}

.coach-composer-button {
  min-width: 116px;
  min-height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--amber) 76%, white 24%), var(--amber));
  color: #fff;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--amber) 28%, transparent);
  transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease, filter .18s ease;
}

.coach-composer-button:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.coach-composer-button:disabled {
  cursor: not-allowed;
  opacity: .55;
  box-shadow: none;
}

.coach-composer-spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, white 35%, transparent);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@media (max-width: 640px) {
  .coach-composer {
    flex-direction: column;
  }

  .coach-composer-button {
    width: 100%;
  }
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
