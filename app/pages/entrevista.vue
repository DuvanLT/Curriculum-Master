<template>
  <NuxtLayout>
    <div class="h-full flex flex-col gap-6">
      <div class="flex justify-between items-end">
        <div>
          <div class="page-title font-head text-[22px] font-bold mb-1 tracking-tighter">Simulación de Entrevista</div>
          <div class="page-sub text-[13px] text-text-dim font-mono">Preparación en tiempo real con simulacion de entrevista guiado por Inteligencia artificial - Beta este apartado aun esta en desarrollo</div>
        </div>
        <div class="flex gap-2">
          <AppButton v-if="!active" @click="startInterview" variant="primary">
            Iniciar Entrevista
          </AppButton>
          <template v-else>
            <AppButton @click="finishAndAnalyze" :loading="analyzing" variant="primary">
              Finalizar y Analizar
            </AppButton>
            <AppButton @click="stopInterview" variant="danger">
              Cancelar
            </AppButton>
          </template>
        </div>
      </div>

      <!-- Results Section (Overlay) -->
      <div v-if="results" class="flex-1 bg-dark-bg3 border border-border rounded-lg p-6 overflow-y-auto">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-xl font-bold text-amber">Reporte de Entrevista</h2>
            <p class="text-sm text-text-dim font-mono">Feedback personalizado y próximos pasos</p>
          </div>
          <AppButton @click="results = null; stopInterview()" variant="secondary">Cerrar</AppButton>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-dark-bg4 p-5 border border-border rounded-lg">
            <h3 class="font-bold mb-3 text-sm uppercase tracking-wider text-text-dim">Resumen del Reclutador</h3>
            <p class="text-[13px] leading-relaxed">{{ results.summary }}</p>
          </div>
          <div class="bg-dark-bg4 p-5 border border-border rounded-lg flex flex-col">
            <h3 class="font-bold mb-3 text-sm uppercase tracking-wider text-text-dim">Sugerencias Personalizadas</h3>
            <div class="flex-1 overflow-y-auto mb-4">
              <ul class="flex flex-col gap-3">
                <li v-for="(step, i) in results.next_steps" :key="i" 
                    class="text-[13px] flex gap-3 p-2 rounded hover:bg-white/5 transition-colors cursor-pointer"
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
              Añadir ({{ selectedSteps.length }}) a mis pasos
            </AppButton>
            <p v-if="stepsAdded" class="text-[10px] text-green text-center mt-2 font-mono flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-[12px]">check_circle</span>
              Pasos añadidos correctamente
            </p>
          </div>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <!-- Video Section (Unchanged) -->
        <div class="flex flex-col gap-4">
          <div class="flex-1 bg-dark-bg3 border border-border rounded-lg overflow-hidden relative group">
            <video ref="videoRef" autoplay muted playsinline class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all"></video>
            <div v-if="!streamActive" class="absolute inset-0 flex items-center justify-center bg-dark-bg4/80 backdrop-blur-sm">
              <div class="text-center p-6 grayscale opacity-30">
                <span class="material-symbols-outlined text-5xl mb-3">videocam_off</span>
                <div class="text-[13px] text-text-dim font-mono">Cámara inactiva</div>
              </div>
            </div>
            <!-- Status Badges -->
            <div class="absolute top-4 left-4 flex gap-2">
              <div v-if="streamActive" class="bg-red/20 text-red text-[10px] px-2 py-0.5 rounded border border-red/30 font-bold uppercase tracking-widest animate-pulse">REC</div>
              <div class="bg-dark-bg/60 backdrop-blur text-text-dim text-[10px] px-2 py-0.5 rounded border border-border/50 font-mono tracking-tighter">HD 1080p</div>
            </div>
          </div>

          <!-- Voice visualizer placeholder -->
          <div class="h-12 bg-dark-bg3 border border-border rounded-lg flex items-center justify-center px-4 gap-2">
            <div v-for="i in 20" :key="i" class="w-1 bg-amber/40 rounded-full transition-all duration-150" 
                 :style="{ height: isListening ? (Math.random() * 80 + 20) + '%' : '10%' }"></div>
          </div>
        </div>

        <!-- Chat / Feedback Section -->
        <AppCard class="flex flex-col min-h-0 !mb-0">
          <div class="chat-area flex-1 overflow-y-auto border border-border rounded-[5px] p-3 bg-dark-bg3 mb-4 flex flex-col gap-3" ref="chatContainer">
            <div v-if="msgs.length === 0" class="flex-1 flex items-center justify-center text-text-dim font-mono text-[12px] opacity-40">
              Presiona "Iniciar Entrevista" para comenzar
            </div>
            <div v-for="(msg, i) in msgs" :key="i" class="max-w-[90%] p-3 rounded-[5px] text-[13px] leading-relaxed"
                 :class="msg.role === 'user' ? 'bg-amber-dim text-amber-light self-end rounded-br-none border border-amber/10' : 'bg-dark-bg4 text-text self-start rounded-bl-none border border-border'">
              <div class="text-[10px] font-mono text-text-dim mb-1 uppercase tracking-tighter">{{ msg.role === 'user' ? 'Tú (Voz)' : 'Reclutador' }}</div>
              {{ msg.text }}
            </div>
            <div v-if="loading" class="self-start bg-dark-bg4 p-3 rounded-[5px] flex gap-1 items-center border border-border">
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
                  Hablando... (Click para enviar)
                </span>
                <span v-else>Click para hablar</span>
              </AppButton>
            </div>
            <div class="text-[11px] text-text-dim text-center font-mono italic">
              {{ isListening ? 'La IA está escuchando... Haz clic de nuevo cuando termines de hablar.' : 'Práctica tu lenguaje corporal y tus respuestas en voz alta.' }}
            </div>
          </div>
        </AppCard>
      </div>
    </div>
    <!-- Confirm Finish Modal -->
    <AppModal
      :show="showConfirmFinish"
      confirm-text="Finalizar de todos modos"
      @close="showConfirmFinish = false"
      @confirm="finishAndAnalyze(true)"
    >
      <template #title>Finalizar Entrevista</template>
      Aún no has empezado la entrevista (no hay mensajes). ¿Estás seguro de que quieres finalizar y analizar de todos modos?
    </AppModal>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { profile, experiences, fetchProfile } = useAppState()
const toast = useToast()
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

onMounted(async () => {
  await fetchProfile()
  setupSpeechRecognition()
})

onUnmounted(() => {
  stopInterview()
})

const setupSpeechRecognition = () => {
  const win = window as any
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition
  if (SpeechRecognition) {
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES'

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
    toast.error('No se pudo acceder a la cámara o micrófono. Por favor permite los permisos.')
  }
}

const stopInterview = () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
  }
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
    for (const stepText of selectedSteps.value) {
      await $fetch('/api/steps', {
        method: 'POST',
        body: { text: `Entrevista: ${stepText}` }
      })
    }
    stepsAdded.value = true
    selectedSteps.value = []
  } catch (e) {
    console.error('Error saving steps:', e)
    toast.error('Hubo un error al guardar los pasos.')
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
        isFinal: true
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
    const errorMsg = e.data?.statusMessage || e.message || 'Error desconocido'
    toast.error('Error en el análisis: ' + errorMsg)
  } finally {
    analyzing.value = false
  }
}

const speak = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel() // Stop current speaking
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
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
    const data = await $fetch('/api/interview', {
      method: 'POST',
      body: {
        messages: msgs.value,
        profile: profile.value,
        experiences: experiences.value
      }
    })
    
    msgs.value.push({ role: 'ai', text: data.text })
    speak(data.text)
  } catch (e) {
    console.error('Interview Error:', e)
    msgs.value.push({ role: 'ai', text: 'Lo siento, hubo un problema con la simulación. Reintenta por favor.' })
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

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}
</style>
