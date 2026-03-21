<template>
  <div class="form-group flex flex-col gap-1.5 mb-3">
    <label v-if="label" class="text-[12px] text-text-dim font-mono uppercase tracking-wider">{{ label }}</label>
    
    <div class="relative w-full">
      <textarea 
        v-if="type === 'textarea'"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        :placeholder="placeholder"
        :rows="rows"
        class="bg-[var(--bg)] border border-border text-text px-2.5 py-2 rounded-md text-[13px] font-body outline-none transition-colors duration-150 focus:border-amber w-full resize-y min-h-[80px]"
      ></textarea>
      
      <select 
        v-else-if="type === 'select'"
        :value="modelValue"
        @change="$emit('update:modelValue', $event.target.value)"
        class="bg-[var(--bg)] border border-border text-text px-2.5 py-2 rounded-md text-[13px] font-body outline-none transition-colors duration-150 focus:border-amber w-full"
      >
        <slot />
      </select>
      
      <div v-else class="relative flex items-center">
        <input 
          :type="inputType"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          :placeholder="placeholder"
          class="bg-[var(--bg)] border border-border text-text px-2.5 py-2 rounded-md text-[13px] font-body outline-none transition-colors duration-150 focus:border-amber w-full"
          :class="{ 'pr-9': type === 'password' }"
        />
        <button 
          v-if="type === 'password'" 
          type="button"
          @click="showPassword = !showPassword"
          class="absolute right-2.5 text-text-dim hover:text-amber transition-colors outline-none flex items-center justify-center h-full px-1"
        >
          <span class="material-symbols-outlined text-[18px]">
            {{ showPassword ? 'visibility_off' : 'visibility' }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  label: String,
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: String,
  rows: { type: Number, default: 3 }
})

const emit = defineEmits(['update:modelValue'])

const showPassword = ref(false)
const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})
</script>

<style scoped>
label {
  font-size: 12px;
  color: var(--text3);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: .5px;
}
input, textarea, select {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 13px;
  font-family: var(--font-body);
  outline: none;
  transition: border .15s;
  width: 100%;
}
input:focus, textarea:focus, select:focus {
  border-color: var(--amber);
}
textarea {
  resize: vertical;
  min-height: 80px;
}
select option {
  background: var(--bg3);
}
</style>
