<template>
  <div class="import-page min-h-screen flex items-center justify-center p-6 bg-dark-bg">
    <div class="import-card w-full max-w-[600px] bg-dark-bg2 border border-border rounded-xl p-10 shadow-2xl relative overflow-hidden">
      <!-- Decorative background -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-amber opacity-5 blur-[100px] -mr-32 -mt-32"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-5 blur-[80px] -ml-24 -mb-24"></div>

      <!-- Magical Loading Overlay -->
      <div v-if="importing" class="absolute inset-0 z-50 bg-dark-bg2/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
        <div class="magic-loader mb-6">
          <div class="magic-circle"></div>
          <div class="magic-sparkles">
            <span class="material-symbols-outlined text-amber animate-pulse">auto_fix_high</span>
          </div>
        </div>
        <h3 class="text-xl font-bold text-white mb-2 font-head tracking-tight">Haciendo la magia...</h3>
        <p class="text-[13px] text-text-dim font-mono max-w-[280px]">Estamos analizando tu trayectoria para potenciar tu perfil al máximo.</p>
      </div>
      
      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-amber text-3xl">auto_fix_high</span>
          </div>
          <div>
            <h1 class="font-head text-2xl font-bold text-white tracking-tight">Potencia tu Perfil</h1>
            <p class="font-mono text-[11px] text-text-dim uppercase tracking-widest">// Paso 1 de 2: Punto de partida</p>
          </div>
        </div>

        <div class="bg-amber/5 border border-amber/20 rounded-xl p-6 mb-8">
          <p class="text-[15px] text-text-muted leading-relaxed">
            Importar un <span class="text-amber font-bold">Curriculum</span> nos ayudará a entender tu punto de partida, además llenaremos la información de tu perfil en base a ello automáticamente.
          </p>
        </div>

        <!-- Upload Area -->
        <div 
          class="border-2 border-dashed border-border hover:border-amber/40 rounded-2xl p-12 transition-all cursor-pointer group mb-8 flex flex-col items-center justify-center bg-dark-bg/40 text-center"
          @click="fileInput?.click()"
          :class="{ 'opacity-50 pointer-events-none': importing }"
        >
          <div class="w-16 h-16 bg-dark-bg3 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-4xl text-text-dim group-hover:text-amber">upload_file</span>
          </div>
          <div class="text-[14px] font-bold text-white mb-2">Haz clic para subir tu CV (PDF o TXT)</div>
          
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            accept=".pdf,.txt" 
            @change="handleFileChange" 
          />
        </div>

        <!-- Selected File & Actions -->
        <div v-if="selectedFile" class="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="flex items-center justify-between bg-dark-bg3 border border-amber/30 p-4 rounded-xl">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-green">task_alt</span>
              <span class="text-[13px] font-mono text-white truncate max-w-[250px]">{{ selectedFile.name }}</span>
            </div>
            <button @click="selectedFile = null" class="text-text-dim hover:text-red transition-colors">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <AppButton 
            v-if="selectedFile"
            variant="primary" 
            size="lg" 
            class="w-full !h-14 font-bold text-lg"
            @click="runMagicImport"
            :loading="importing"
          >
            🚀 Iniciar Magia
          </AppButton>
          
          <button 
            v-else
            @click="skipImport" 
            class="w-full h-14 border border-border rounded-xl text-text-dim hover:text-white hover:bg-white/5 transition-all text-[14px] font-medium flex items-center justify-center gap-2"
          >
            Llenar manualmente (Omitir)
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const { mergeImportedProfile, bulkExperience, saveProfile } = useAppState()
const toast = useToast()

const importing = ref(false)
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
  }
}

const runMagicImport = async () => {
  if (!selectedFile.value) return
  importing.value = true
  
  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    const data: any = await $fetch<any>('/api/import', {
      method: 'POST',
      body: formData
    })
    
    mergeImportedProfile(data)
    
    // Add experiences
    if (data.experiences?.length > 0) {
      await bulkExperience(data.experiences)
    } else {
      await saveProfile()
    }
    
    toast.success('¡Increíble! Hemos procesado tu CV con éxito.')
    await navigateTo('/perfil')
  } catch (e: any) {
    console.error(e)
    toast.error('Hubo un error al procesar tu archivo. Por favor intenta de nuevo.')
  } finally {
    importing.value = false
  }
}

const skipImport = () => {
  navigateTo('/perfil')
}
</script>

<style scoped>
.import-page {
  background-image: 
    radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.03) 1px, transparent 0);
  background-size: 40px 40px;
}
.import-card {
  box-shadow: 0 4px 50px rgba(0, 0, 0, 0.6);
}

/* Magic Loader Styles */
.magic-loader {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.magic-circle {
  position: absolute;
  inset: 0;
  border: 3px solid rgba(var(--amber-rgb, 255, 191, 0), 0.1);
  border-top: 3px solid var(--amber);
  border-radius: 50%;
  animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.magic-circle::before {
  content: '';
  position: absolute;
  inset: -8px;
  border: 1px solid var(--amber);
  opacity: 0.2;
  border-radius: 50%;
  animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.magic-sparkles {
  z-index: 1;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes ping {
  75%, 100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
</style>
