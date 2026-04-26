<template>
  <NuxtLayout>
    <div class="h-full flex flex-col gap-6">
      <div class="flex justify-between items-end">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('entrevista.title') }} <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('entrevista.subtitle') }}</div>
        </div>
        <div class="flex gap-2">
          <AppButton v-if="!active" @click="startInterview" variant="primary">
            {{ $t('entrevista.btn_start') }}
          </AppButton>
          <template v-else>
            <AppButton @click="finishAndAnalyze" :loading="analyzing" variant="primary">
              {{ $t('entrevista.btn_finish') }}
            </AppButton>
            <AppButton @click="stopInterview" variant="danger">
              {{ $t('entrevista.btn_cancel') }}
            </AppButton>
          </template>
        </div>
      </div>

      <!-- Results Section (Overlay) -->
      <div v-if="results" class="flex-1 bg-[var(--bg)]-bg3 border border-border rounded-lg p-6 overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-xl font-bold text-amber">{{ $t('entrevista.report_title') }}</h2>
            <p class="text-sm text-text-dim font-mono">{{ $t('entrevista.report_subtitle') }}</p>
          </div>
          <AppButton @click="results = null; stopInterview()" variant="secondary">{{ $t('entrevista.btn_close') }}</AppButton>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-[var(--bg)]-bg4 p-5 border border-border rounded-lg">
            <h3 class="font-bold mb-3 text-sm uppercase tracking-wider text-text-dim">{{ $t('entrevista.summary_title') }}</h3>
            <p class="text-[13px] leading-relaxed">{{ results.summary }}</p>
          </div>
          <div class="bg-[var(--bg)]-bg4 p-5 border border-border rounded-lg flex flex-col">
            <h3 class="font-bold mb-3 text-sm uppercase tracking-wider text-text-dim">{{ $t('entrevista.suggestions_title') }}</h3>
            <div class="flex-1 overflow-y-auto mb-4">
              <ul class="flex flex-col gap-3">
                <li v-for="(step, i) in results.next_steps" :key="i" 
                    class="result-step text-[13px] flex gap-3 p-2 rounded transition-colors cursor-pointer"
                    @click="toggleSelection(step)"
                >
                  <div class="w-[18px] h-[18px] border-2 rounded-[3px] flex items-center justify-center shrink-0 mt-0.5"
                       :class="selectedSteps.includes(step) ? 'bg-amber border-amber' : 'border-border'">
                    <span v-if="selectedSteps.includes(step)" class="material-symbols-outlined text-dark-bg font-bold text-[14px]">check</span>
                  </div>
                  {{ step }}
                </li>
              </ul>
            </div>
            <AppButton 
              @click="saveSelectedSteps" 
              class="w-full" 
              variant="primary" 
              :disabled="selectedSteps.length === 0 || savingSteps"
              :loading="savingSteps"
            >
              {{ $t('entrevista.btn_add_steps', { count: selectedSteps.length }) }}
            </AppButton>
            <p v-if="stepsAdded" class="text-[10px] text-green text-center mt-2 font-mono flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[12px]">check_circle</span>
              {{ $t('entrevista.steps_added') }}
            </p>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <!-- Video Section (Unchanged) -->
        <div class="flex flex-col gap-4">
          <div class="flex-1 bg-[var(--bg)]-bg3 border border-border rounded-lg overflow-hidden relative group">
            <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"></video>
            <div v-if="!streamActive" class="absolute inset-0 flex items-center justify-center bg-[var(--bg)]-bg4/80 backdrop-blur-sm">
              <div class="text-center p-6 grayscale opacity-30">
                <span class="material-symbols-outlined text-5xl mb-3">videocam_off</span>
                <div class="text-[13px] text-text-dim font-mono">{{ $t('entrevista.camera_inactive') }}</div>
              </div>
            </div>
            <!-- Status Badges -->
            <div class="absolute top-4 left-4 flex gap-2">
              <div v-if="streamActive" class="bg-red/20 text-red text-[10px] px-2 py-0.5 rounded border border-red/30 font-bold uppercase tracking-widest animate-pulse">{{ $t('entrevista.rec') }}</div>
              <div class="bg-[var(--bg)]-bg/60 backdrop-blur text-text-dim text-[10px] px-2 py-0.5 rounded border border-border/50 font-mono tracking-tighter">{{ $t('entrevista.hd') }}</div>
            </div>
          </div>

          <!-- Voice visualizer placeholder -->
          <div class="h-12 bg-[var(--bg)]-bg3 border border-border rounded-lg flex items-center justify-center px-4 gap-2">
            <div v-for="i in 20" :key="i" class="w-1 bg-amber/40 rounded-full transition-all duration-150" 
                 :style="{ height: isListening ? (Math.random() * 80 + 20) + '%' : '10%' }"></div>
          </div>
        </div>

        <!-- Chat / Feedback Section -->
        <AppCard class="flex flex-col min-h-0 !mb-0">
          <div class="chat-area flex-1 overflow-y-auto border border-border rounded-[5px] p-3 bg-[var(--bg)]-bg3 mb-4 flex flex-col gap-3" ref="chatContainer">
            <div v-if="msgs.length === 0" class="flex-1 flex items-center justify-center text-text-dim font-mono text-[12px] opacity-40">
              {{ $t('entrevista.chat_placeholder') }}
            </div>
            <div v-for="(msg, i) in msgs" :key="i" class="max-w-[90%] p-3 rounded-[5px] text-[13px] leading-relaxed"
                 :class="msg.role === 'user' ? 'bg-amber-dim text-amber-light self-end rounded-br-none border border-amber/10' : 'bg-[var(--bg)]-bg4 text-text self-start rounded-bl-none border border-border'">
              <div class="text-[10px] font-mono text-text-dim mb-1 uppercase tracking-tighter">{{ msg.role === 'user' ? $t('entrevista.role_user') : $t('entrevista.role_ai') }}</div>
              {{ msg.text }}
            </div>
            <div v-if="loading" class="self-start bg-[var(--bg)]-bg4 p-3 rounded-[5px] flex gap-1 items-center border border-border">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>

          <div class="flex flex-col gap-3">
            <div class="flex gap-2">
              <AppButton 
                class="flex-1 !h-14 font-bold text-base" 
                :variant="isListening ? 'warning' : 'primary'"
                :disabled="!active || loading"
                @click="toggleListening"
              >
                <span v-if="isListening" class="flex items-center gap-2">
                  <span class="w-2 h-2 bg-white rounded-full animate-ping"></span>
                  {{ $t('entrevista.btn_speaking') }}
                </span>
                <span v-else>{{ $t('entrevista.btn_click_to_speak') }}</span>
              </AppButton>
            </div>
            <div class="text-[11px] text-text-dim text-center font-mono italic">
              {{ isListening ? $t('entrevista.note_listening') : $t('entrevista.note_practice') }}
            </div>
          </div>
        </AppCard>
      </div>
    </div>
    <!-- Confirm Finish Modal -->
    <AppModal
      :show="showConfirmFinish"
      :confirm-text="$t('entrevista.modal_finish_anyway')"
      @close="showConfirmFinish = false"
      @confirm="finishAndAnalyze(true)"
    >
      <template #title>{{ $t('entrevista.modal_title') }}</template>
      {{ $t('entrevista.modal_desc') }}
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { profile, experiences, fetchProfile } = useAppState()
const toast = useToast()
const { t, locale } = useI18n()
const MAX_STEPS = 40
const msgs = ref<{ role: string; text: string }[]>([])
const loading = ref(false)
const active = ref(false)
const streamActive = ref(false)
const isListening = ref(false)
const analyzing = ref(false)
const results = ref<any>(null)
const selectedSteps = ref<string[]>([])
const savingSteps = ref(false)
const stepsAdded = ref(false)
const transcribedText = ref('')
const showConfirmFinish = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const chatContainer = ref<HTMLElement | null>(null)

let recognition: any = null
let mediaStream: MediaStream | null = null
let currentAudio: HTMLAudioElement | null = null
let currentAudioUrl: string | null = null

onMounted(async () => {
  await fetchProfile()
  setupSpeechRecognition()
})

onUnmounted(() => {
  cleanupAudio()
  stopInterview()
})

const setupSpeechRecognition = () => {
  const win = window as any
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = locale.value === 'en' ? 'en-US' : 'es-ES'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        transcribedText.value += ' ' + finalTranscript
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  }
}

const startInterview = async () => {
  results.value = null
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
    }
    streamActive.value = true
    active.value = true
    
    // Initial recruiter greeting
    await sendResponse('') 
  } catch (err) {
    console.error('Error accessing camera:', err)
    toast.error(t('entrevista.toast_camera_error'))
  }
}

const stopInterview = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
  }
  cleanupAudio()
  streamActive.value = false
  active.value = false
  if (recognition) recognition.stop()
  isListening.value = false
  msgs.value = []
  transcribedText.value = ''
}

const toggleListening = () => {
  if (!recognition) return
  if (isListening.value) {
    recognition.stop()
    isListening.value = false
    if (transcribedText.value.trim()) {
      sendResponse(transcribedText.value.trim())
      transcribedText.value = ''
    }
  } else {
    transcribedText.value = ''
    isListening.value = true
    recognition.start()
  }
}

const toggleSelection = (step: string) => {
  if (selectedSteps.value.includes(step)) {
    selectedSteps.value = selectedSteps.value.filter(s => s !== step)
  } else {
    selectedSteps.value.push(step)
  }
}

const saveSelectedSteps = async () => {
  savingSteps.value = true
  try {
    const existingSteps = await $fetch<{ id: string }[]>('/api/steps')
    if (existingSteps.length + selectedSteps.value.length > MAX_STEPS) {
      toast.warning(t('entrevista.toast_max_steps_1'))
      return
    }

    for (const stepText of selectedSteps.value) {
      await $fetch('/api/steps', {
        method: 'POST',
        body: { text: `Entrevista: ${stepText}` }
      })
    }
    stepsAdded.value = true
    selectedSteps.value = []
  } catch (e: any) {
    console.error('Error saving steps:', e)
    const message = e?.data?.statusMessage || e?.statusMessage || e?.message || ''
    if (message.includes('maximo de 40 tareas') || message.includes('maximum of 40 tasks')) {
      toast.warning(t('entrevista.toast_max_steps_2'))
      return
    }
    toast.error(t('entrevista.toast_save_error'))
  } finally {
    savingSteps.value = false
  }
}

const finishAndAnalyze = async (force = false) => {
  if (msgs.value.length === 0 && !force) {
    showConfirmFinish.value = true
    return
  }
  showConfirmFinish.value = false
  analyzing.value = true
  try {
    const data = await $fetch('/api/interview', {
      method: 'POST',
      body: {
        messages: msgs.value,
        profile: profile.value,
        experiences: experiences.value,
        isFinal: true,
        locale: locale.value
      }
    })
    
    // Robust parsing in case it comes as a string
    let parsedData = data
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data)
      } catch (e) {
        console.error('Failed to parse analysis data:', data)
      }
    }

    results.value = parsedData
    selectedSteps.value = Array.isArray(parsedData?.next_steps) ? [...parsedData.next_steps] : []
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      streamActive.value = false
    }
  } catch (e: any) {
    console.error('Analysis Error:', e)
    // Nuxt $fetch errors store the message in data.statusMessage or just message
    const errorMsg = e.data?.statusMessage || e.message || t('entrevista.unknown_error')
    toast.error(t('entrevista.toast_analysis_error') + errorMsg)
  } finally {
    analyzing.value = false
  }
}

const cleanupAudio = () => {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl)
    currentAudioUrl = null
  }
}

const speak = async (text: string, audioBase64?: string | null, audioMimeType?: string | null) => {
  cleanupAudio()

  if (audioBase64 && audioMimeType) {
    try {
      const binary = atob(audioBase64)
      const bytes = new Uint8Array(binary.length)

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }

      const blob = new Blob([bytes], { type: audioMimeType })
      currentAudioUrl = URL.createObjectURL(blob)
      currentAudio = new Audio(currentAudioUrl)
      await currentAudio.play()
      return
    } catch (error) {
      console.error('OpenAI audio playback failed, using browser speech fallback:', error)
      cleanupAudio()
    }
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = locale.value === 'en' ? 'en-US' : 'es-ES'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }
}

const sendResponse = async (text: string) => {
  if (text) {
    msgs.value.push({ role: 'user', text })
  }
  
  loading.value = true
  scrollToBottom()

  try {
    const data = await $fetch<{ text: string; audio?: string | null; audioMimeType?: string | null }>('/api/interview', {
      method: 'POST',
      body: {
        messages: msgs.value,
        profile: profile.value,
        experiences: experiences.value,
        locale: locale.value
      }
    })
    
    msgs.value.push({ role: 'ai', text: data.text })
    await speak(data.text, data.audio, data.audioMimeType)
  } catch (e) {
    console.error('Interview Error:', e)
    msgs.value.push({ role: 'ai', text: t('entrevista.toast_simulation_error') })
  } finally {
    loading.value = false
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}
</script>

<style scoped>
.chat-area::-webkit-scrollbar {
  width: 4px;
}
.chat-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}
.typing-dot {
  width: 6px;
  height: 6px;
  background: var(--amber);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

.result-step:hover {
  background: var(--bg3);
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}
</style>
