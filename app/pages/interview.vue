<template>
  <NuxtLayout>
    <div class="h-full flex flex-col gap-6">
      <div class="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">{{ $t('entrevista.title') }} <HelpButton /></div>
          <div class="page-sub text-[13px] text-text-dim font-mono">{{ $t('entrevista.subtitle') }}</div>
        </div>
        <div class="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <AppButton v-if="!active" @click="handleStartInterview" variant="primary" class="w-full sm:w-auto">
            {{ $t('entrevista.btn_start') }}
          </AppButton>
          <template v-else>
            <AppButton @click="finishAndAnalyze" :loading="analyzing" variant="primary" class="w-full sm:w-auto">
              {{ $t('entrevista.btn_finish') }}
            </AppButton>
            <AppButton @click="stopInterview" variant="danger" class="w-full sm:w-auto">
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
              @click="handleSaveSelectedSteps" 
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

      <div v-else class="flex-1 min-h-0">
        <div class="interview-stage">
          <section class="single-wave-panel" :class="singleWavePanelClass">
            <div class="single-wave-panel__head">
              <div>
                <h2 class="single-wave-panel__title">{{ currentSpeakerTitle }}</h2>
              </div>
              <span class="single-wave-panel__status">{{ currentSpeakerStatus }}</span>
            </div>

            <div class="single-wave-shell">
              <div class="single-wave" :class="[singleWaveClass, { 'is-active': waveIsActive }]" aria-hidden="true">
                <span
                  v-for="(bar, index) in waveBars"
                  :key="`wave-${bar}`"
                  class="single-wave__bar"
                  :style="{
                    height: `${waveHeights[index]}px`,
                    opacity: waveOpacities[index]
                  }"
                ></span>
              </div>
            </div>

            <AppButton
              class="single-wave-panel__cta single-wave-panel__cta-icon"
              :variant="isListening ? 'warning' : 'primary'"
              :disabled="!active || loading"
              @click="toggleListening"
            >
              <div class="flex items-center gap-2.5 px-1">
                <span class="material-symbols-outlined text-[20px] leading-none">mic</span>
                <span class="font-bold text-[13px] uppercase tracking-wider">{{ $t('entrevista.press_to_talk') }}</span>
              </div>
            </AppButton>
          </section>

          <AppCard class="history-card compact-chat flex flex-col min-h-0 !mb-0">
            <div class="history-card__head">
              <div>
                <p class="history-card__label">Historial</p>
                <h3 class="history-card__title">Conversacion</h3>
              </div>
              <span class="history-card__count">{{ msgs.length }}</span>
            </div>

            <div class="chat-area flex-1 overflow-y-auto mt-4 pr-1 flex flex-col gap-2" ref="chatContainer">
              <div v-if="msgs.length === 0" class="flex-1 flex items-center justify-center text-text-dim font-mono text-[11px] opacity-40 text-center px-4">
                {{ $t('entrevista.chat_placeholder') }}
              </div>
              <div v-for="(msg, i) in msgs" :key="i" class="history-bubble"
                   :class="msg.role === 'user' ? 'history-bubble-user self-end' : 'history-bubble-ai self-start'">
                <div class="text-[9px] font-mono text-text-dim mb-1 uppercase tracking-[0.24em]">
                  {{ msg.role === 'user' ? $t('entrevista.role_user') : $t('entrevista.role_ai') }}
                </div>
                <p class="leading-relaxed">{{ msg.text }}</p>
              </div>
              <div v-if="loading" class="history-bubble history-bubble-ai self-start flex gap-1 items-center">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
            </div>
          </AppCard>
        </div>
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

const { user } = useAuth()
const { showUpgradeModal } = useSubscription()
const { profile, experiences, fetchProfile } = useAppState()
const toast = useToast()
const { t, locale } = useI18n()
const MAX_STEPS = 40
const msgs = ref<{ role: string; text: string }[]>([])
const loading = ref(false)
const active = ref(false)
const isListening = ref(false)
const analyzing = ref(false)
const results = ref<any>(null)
const selectedSteps = ref<string[]>([])
const savingSteps = ref(false)
const stepsAdded = ref(false)
const aiSpeaking = ref(false)
const transcribedText = ref('')
const showConfirmFinish = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const waveBars = Array.from({ length: 20 }, (_, index) => index)
const waveHeights = ref<number[]>(Array.from({ length: 20 }, () => 18))
const waveOpacities = computed(() => waveHeights.value.map((height) => {
  const normalized = Math.max(0.34, Math.min(1, height / 96))
  return Number(normalized.toFixed(2))
}))
const waveIsActive = computed(() => isListening.value || aiSpeaking.value || loading.value)
const currentSpeaker = computed<'user' | 'ai' | 'idle'>(() => {
  if (isListening.value) return 'user'
  if (aiSpeaking.value || loading.value) return 'ai'
  return 'idle'
})
const currentSpeakerLabel = computed(() => {
  if (currentSpeaker.value === 'user') return t('entrevista.role_user')
  if (currentSpeaker.value === 'ai') return t('entrevista.role_ai')
  return t('entrevista.title')
})
const currentSpeakerTitle = computed(() => {
  if (currentSpeaker.value === 'user') return t('entrevista.btn_speaking')
  if (currentSpeaker.value === 'ai') {
    return aiSpeaking.value ? t('entrevista.status_ai_speaking') : t('entrevista.status_thinking')
  }
  return t('entrevista.status_ready')
})
const currentSpeakerStatus = computed(() => {
  if (currentSpeaker.value === 'user') return t('entrevista.status_your_voice')
  if (currentSpeaker.value === 'ai') return aiSpeaking.value ? t('entrevista.status_ia') : t('entrevista.status_processing')
  return active.value ? t('entrevista.status_waiting') : t('entrevista.status_paused')
})
const singleWaveClass = computed(() => {
  if (currentSpeaker.value === 'user') return 'single-wave-user'
  if (currentSpeaker.value === 'ai') return 'single-wave-ai'
  return 'single-wave-idle'
})
const singleWavePanelClass = computed(() => {
  if (currentSpeaker.value === 'user') return 'single-wave-panel-user'
  if (currentSpeaker.value === 'ai') return 'single-wave-panel-ai'
  return 'single-wave-panel-idle'
})

let recognition: any = null
let mediaStream: MediaStream | null = null
let currentAudio: HTMLAudioElement | null = null
let currentAudioUrl: string | null = null
let audioContext: AudioContext | null = null
let micAnalyser: AnalyserNode | null = null
let aiAnalyser: AnalyserNode | null = null
let micSource: MediaStreamAudioSourceNode | null = null
let aiSource: MediaElementAudioSourceNode | null = null
let speechWaveTimer: number | null = null
let waveAnimationFrame: number | null = null
let aiAnalyserElement: HTMLAudioElement | null = null

onMounted(async () => {
  await fetchProfile()
  setupSpeechRecognition()
})

onUnmounted(() => {
  stopWaveAnimation()
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

const handleStartInterview = () => {
  if (user.value?.subscription_name !== 'pro') {
    showUpgradeModal.value = true
    return
  }
  startInterview()
}

const startInterview = async () => {
  results.value = null
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    await setupMicAnalyser(mediaStream)
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
    mediaStream = null
  }
  disconnectMicAnalyser()
  cleanupAudio()
  active.value = false
  aiSpeaking.value = false
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

const handleSaveSelectedSteps = () => {
  if (user.value?.subscription_name !== 'pro') {
    showUpgradeModal.value = true
    return
  }
  saveSelectedSteps()
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
      mediaStream = null
    }
    disconnectMicAnalyser()
  } catch (e: any) {
    console.error('Analysis Error:', e)
    // Nuxt $fetch errors store the message in data.statusMessage or just message
    const errorMsg = e.data?.statusMessage || e.message || t('entrevista.unknown_error')
    toast.error(t('entrevista.toast_analysis_error') + errorMsg)
  } finally {
    analyzing.value = false
  }
}

const ensureAudioContext = async () => {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null

  if (!audioContext) {
    audioContext = new AudioCtx()
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  return audioContext
}

const disconnectMicAnalyser = () => {
  if (micSource) {
    micSource.disconnect()
    micSource = null
  }
  micAnalyser = null
}

const disconnectAiAnalyser = () => {
  if (aiSource) {
    aiSource.disconnect()
    aiSource = null
  }
  aiAnalyser = null
  aiAnalyserElement = null
}

const setupMicAnalyser = async (stream: MediaStream) => {
  const ctx = await ensureAudioContext()
  if (!ctx) return

  disconnectMicAnalyser()

  micSource = ctx.createMediaStreamSource(stream)
  micAnalyser = ctx.createAnalyser()
  micAnalyser.fftSize = 256
  micAnalyser.smoothingTimeConstant = 0.82
  micSource.connect(micAnalyser)
  startWaveAnimation()
}

const attachAiAnalyser = async (audio: HTMLAudioElement) => {
  const ctx = await ensureAudioContext()
  if (!ctx) return

  if (aiAnalyserElement === audio && aiAnalyser) {
    startWaveAnimation()
    return
  }

  disconnectAiAnalyser()
  aiSource = ctx.createMediaElementSource(audio)
  aiAnalyser = ctx.createAnalyser()
  aiAnalyser.fftSize = 256
  aiAnalyser.smoothingTimeConstant = 0.78
  aiSource.connect(aiAnalyser)
  aiAnalyser.connect(ctx.destination)
  aiAnalyserElement = audio
  startWaveAnimation()
}

const resetWaveHeights = () => {
  waveHeights.value = waveHeights.value.map(() => 18)
}

const sampleAnalyser = (analyser: AnalyserNode | null) => {
  if (!analyser) return null

  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  const bucketSize = Math.max(1, Math.floor(data.length / waveBars.length))

  return waveBars.map((_, index) => {
    const start = index * bucketSize
    const end = Math.min(data.length, start + bucketSize)
    let sum = 0

    for (let i = start; i < end; i++) {
      sum += data[i] ?? 0
    }

    const average = sum / Math.max(1, end - start)
    const normalized = average / 255
    return 14 + normalized * 120
  })
}

const updateWaveFrame = () => {
  let nextHeights: number[] | null = null

  if (isListening.value && micAnalyser) {
    nextHeights = sampleAnalyser(micAnalyser)
  } else if ((aiSpeaking.value || loading.value) && aiAnalyser) {
    nextHeights = sampleAnalyser(aiAnalyser)
  }

  if (!nextHeights) {
    nextHeights = waveHeights.value.map((height, index) => {
      const target = waveIsActive.value ? 26 + Math.sin((Date.now() / 160) + index) * 8 : 18
      return height + (target - height) * 0.18
    })
  } else {
    nextHeights = nextHeights.map((target, index) => {
      const current = waveHeights.value[index] ?? 18
      return current + (target - current) * 0.35
    })
  }

  waveHeights.value = nextHeights.map((height) => Math.max(10, Math.min(132, Number(height.toFixed(2)))))
  waveAnimationFrame = window.requestAnimationFrame(updateWaveFrame)
}

const startWaveAnimation = () => {
  if (waveAnimationFrame !== null) return
  waveAnimationFrame = window.requestAnimationFrame(updateWaveFrame)
}

const stopWaveAnimation = () => {
  if (waveAnimationFrame !== null) {
    window.cancelAnimationFrame(waveAnimationFrame)
    waveAnimationFrame = null
  }
}

const startSpeechWaveFallback = () => {
  if (speechWaveTimer !== null) {
    window.clearInterval(speechWaveTimer)
  }

  startWaveAnimation()
  speechWaveTimer = window.setInterval(() => {
    if (!aiSpeaking.value || aiAnalyser) return

    waveHeights.value = waveBars.map((_, index) => {
      const swing = Math.abs(Math.sin((Date.now() / 140) + index * 0.65))
      return 16 + swing * 86
    })
  }, 90)
}

const stopSpeechWaveFallback = () => {
  if (speechWaveTimer !== null) {
    window.clearInterval(speechWaveTimer)
    speechWaveTimer = null
  }
}

const cleanupAudio = () => {
  stopSpeechWaveFallback()

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio = null
  }

  disconnectAiAnalyser()

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl)
    currentAudioUrl = null
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }

  aiSpeaking.value = false
  if (!isListening.value) {
    resetWaveHeights()
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
      await attachAiAnalyser(currentAudio)
      aiSpeaking.value = true
      await new Promise<void>(async (resolve, reject) => {
        if (!currentAudio) {
          aiSpeaking.value = false
          resolve()
          return
        }

        currentAudio.onended = () => {
          aiSpeaking.value = false
          resolve()
        }
        currentAudio.onerror = () => {
          aiSpeaking.value = false
          reject(new Error('Audio playback failed'))
        }

        try {
          await currentAudio.play()
        } catch (playError) {
          aiSpeaking.value = false
          reject(playError)
        }
      })
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
    aiSpeaking.value = true
    startSpeechWaveFallback()

    await new Promise<void>((resolve) => {
      utterance.onend = () => {
        aiSpeaking.value = false
        stopSpeechWaveFallback()
        resetWaveHeights()
        resolve()
      }
      utterance.onerror = () => {
        aiSpeaking.value = false
        stopSpeechWaveFallback()
        resetWaveHeights()
        resolve()
      }
      window.speechSynthesis.speak(utterance)
    })
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
.interview-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 360px);
  gap: 20px;
  min-height: 100%;
}

.single-wave-panel {
  position: relative;
  overflow: hidden;
  height: 600px;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), transparent 30%),
    linear-gradient(145deg, rgba(18, 24, 41, 0.97), rgba(9, 12, 22, 0.99));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
}

.single-wave-panel::after {
  content: '';
  position: absolute;
  right: -80px;
  bottom: -80px;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  filter: blur(16px);
  opacity: 0.22;
}

.single-wave-panel-idle::after {
  background: rgba(149, 163, 184, 0.28);
}

.single-wave-panel-user::after {
  background: rgba(255, 181, 72, 0.58);
}

.single-wave-panel-ai::after {
  background: rgba(90, 154, 255, 0.58);
}

.single-wave-panel__head {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.single-wave-panel__label {
  margin: 0 0 10px;
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(232, 238, 255, 0.6);
  font-family: var(--font-mono, monospace);
}

.single-wave-panel__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: #f6f8ff;
}

.single-wave-panel__status {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(246, 248, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-family: var(--font-mono, monospace);
}

.single-wave-shell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.single-wave {
  width: min(100%, 620px);
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.single-wave__bar {
  width: 10px;
  height: 18px;
  border-radius: 999px;
  transition: height 90ms linear, opacity 120ms ease;
  opacity: 0.42;
  transform-origin: center;
}

.single-wave-idle .single-wave__bar {
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.9), rgba(100, 116, 139, 0.18));
}

.single-wave-user .single-wave__bar {
  background: linear-gradient(180deg, rgba(255, 222, 150, 0.98), rgba(255, 170, 0, 0.26));
}

.single-wave-ai .single-wave__bar {
  background: linear-gradient(180deg, rgba(182, 218, 255, 0.98), rgba(72, 120, 255, 0.28));
}

.single-wave-panel__cta {
  position: relative;
  z-index: 1;
}

.single-wave-panel__cta-icon {
  min-width: 52px;
  height: 52px !important;
  padding: 0 24px !important;
  border-radius: 999px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
}

.history-card {
  padding: 16px !important;
  border-radius: 20px !important;
  background: rgba(255, 255, 255, 0.02);
}

.compact-chat {
  height: 600px;
}

.history-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-card__label {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--text-dim);
  font-family: var(--font-mono, monospace);
}

.history-card__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.1;
}

.history-card__count {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 11px;
  font-family: var(--font-mono, monospace);
}

.chat-area::-webkit-scrollbar {
  width: 4px;
}
.chat-area::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}

.history-bubble {
  max-width: 92%;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 1.55;
  border: 1px solid var(--border);
}

.history-bubble-user {
  background: rgba(255, 191, 73, 0.08);
  color: var(--amber-light);
  border-color: rgba(255, 191, 73, 0.18);
}

.history-bubble-ai {
  background: var(--bg3);
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

@media (max-width: 768px) {
  .interview-stage {
    grid-template-columns: 1fr;
  }

  .single-wave-panel {
    height: 400px;
    padding: 22px;
    border-radius: 22px;
  }

  .single-wave-panel__title {
    font-size: 26px;
  }

  .single-wave {
    height: 132px;
    gap: 7px;
  }

  .single-wave__bar {
    width: 8px;
  }

  .compact-chat {
    height: 350px;
  }
}
</style>
