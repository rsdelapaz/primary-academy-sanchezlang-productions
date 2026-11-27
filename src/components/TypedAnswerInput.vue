<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ submit: [answer: string] }>()
const answer = ref('')
const formElement = ref<{
  scrollIntoView: (options?: { block?: 'nearest'; behavior?: 'smooth' | 'auto' }) => void
} | null>(null)
let scrollTimer: ReturnType<typeof globalThis.setTimeout> | undefined

function keepFormVisible() {
  globalThis.clearTimeout(scrollTimer)
  scrollTimer = globalThis.setTimeout(() => {
    const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    formElement.value?.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, 250)
}

function submit() {
  if (answer.value.trim() && !props.disabled) {
    globalThis.clearTimeout(scrollTimer)
    emit('submit', answer.value)
  }
}

watch(() => props.disabled, (disabled) => {
  if (disabled) globalThis.clearTimeout(scrollTimer)
})
onBeforeUnmount(() => globalThis.clearTimeout(scrollTimer))
</script>

<template>
  <form ref="formElement" class="typed-answer-form" @submit.prevent="submit">
    <label for="typed-answer-input">Tu respuesta</label>
    <input
      id="typed-answer-input"
      v-model="answer"
      class="typed-answer-input"
      type="text"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      enterkeyhint="done"
      required
      :disabled="props.disabled"
      aria-label="Escribe tu respuesta"
      @focus="keepFormVisible"
    />
    <button class="button primary typed-answer-submit" type="submit" :disabled="props.disabled || !answer.trim()">
      Comprobar respuesta
    </button>
  </form>
</template>
