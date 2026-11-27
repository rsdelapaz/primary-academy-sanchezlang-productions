<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUpdated, ref } from 'vue'

const props = defineProps<{
  automatic: boolean
  seconds: number
  paused: boolean
  blockedByTreasure: boolean
  hasTreasureAvailable: boolean
  finalQuestion: boolean
  disabled: boolean
  correct: boolean
  correction: string
  correctionLanguage: string
  summary: string
  summaryLanguage: string
}>()

const emit = defineEmits<{
  next: []
  togglePause: []
  showTreasures: []
  showExplanation: []
  height: [pixels: number]
}>()

const bar = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const nextButton = ref<InstanceType<typeof globalThis.HTMLButtonElement> | null>(null)
let observer: InstanceType<typeof globalThis.ResizeObserver> | undefined
let lastHeight = -1

const nextLabel = computed(() => props.finalQuestion ? 'Ver resultados' : 'Siguiente')
const advanceStatus = computed(() => {
  if (props.blockedByTreasure) return 'Abre un cofre o guarda tus llaves.'
  if (!props.automatic) return ''
  if (props.paused) return 'Avance automático pausado'
  return 'Avance automático en marcha'
})

function measureBar() {
  const height = Math.ceil(bar.value?.getBoundingClientRect().height ?? 0)
  if (height === lastHeight) return
  lastHeight = height
  emit('height', height)
}

onMounted(() => {
  measureBar()
  if (typeof globalThis.ResizeObserver === 'function' && bar.value) {
    observer = new globalThis.ResizeObserver(measureBar)
    observer.observe(bar.value)
  } else {
    globalThis.addEventListener('resize', measureBar)
  }
})
// Keep the fallback accurate when labels wrap, even without ResizeObserver.
onUpdated(measureBar)
onBeforeUnmount(() => {
  observer?.disconnect()
  globalThis.removeEventListener('resize', measureBar)
})

defineExpose({
  focusNext: () => nextButton.value?.focus({ preventScroll: true }),
})
</script>

<template>
  <section
    ref="bar"
    class="game-advance-bar"
    aria-label="Continuar la partida"
  >
    <div class="advance-inner">
      <div class="advance-copy">
        <strong
          class="advance-result"
          :class="{ correct }"
        >
          <span aria-hidden="true">{{ correct ? '✓' : '↻' }}</span>
          <span v-if="correct">¡Correcto!</span>
          <span v-else>
            Correcta:
            <span :lang="correctionLanguage">{{ correction }}</span>
          </span>
        </strong>
        <span
          v-if="correct && summary"
          class="advance-summary"
          :lang="summaryLanguage"
        >{{ summary }}</span>
        <div
          v-if="advanceStatus"
          class="advance-status"
        >
          <span
            v-if="automatic && !paused && !blockedByTreasure"
            class="countdown"
            aria-hidden="true"
          >
            Avance en {{ Math.max(0, seconds) }} s
          </span>
          <span
            :class="{ 'sr-only': automatic && !paused && !blockedByTreasure }"
            role="status"
          >
            {{ advanceStatus }}
          </span>
        </div>
        <button
          class="explanation-action"
          type="button"
          :disabled="disabled"
          @click="emit('showExplanation')"
        >
          Ver explicación
        </button>
      </div>
      <div class="advance-actions">
        <button
          v-if="automatic && !blockedByTreasure"
          class="button secondary pause-action"
          type="button"
          :disabled="disabled"
          @click="emit('togglePause')"
        >
          <span aria-hidden="true">{{ paused ? '▶' : 'Ⅱ' }}</span>
          {{ paused ? 'Reanudar' : 'Pausar' }}
        </button>
        <button
          v-if="hasTreasureAvailable"
          class="button secondary treasure-action"
          type="button"
          :disabled="disabled"
          @click="emit('showTreasures')"
        >
          Abrir cofres
        </button>
        <button
          ref="nextButton"
          class="button primary next-action"
          type="button"
          :disabled="disabled"
          @click="emit('next')"
        >
          {{ nextLabel }} <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.game-advance-bar {
  position: fixed;
  z-index: 4;
  inset: auto 0 0;
  padding: 10px 12px 14px;
  padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 -8px 28px rgb(0 0 0 / 12%);
}

.advance-inner {
  display: grid;
  gap: 8px;
  width: min(100%, 1036px);
  margin-inline: auto;
}

.advance-copy {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

.advance-result {
  min-width: 0;
  overflow-wrap: anywhere;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 15px;
  line-height: 1.2;
}

.advance-result.correct {
  color: var(--color-success-text);
}

.advance-status {
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 750;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.advance-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.advance-actions > .button {
  flex: 1 1 112px;
  min-width: 0;
  min-height: 48px;
  padding: 8px 10px;
  line-height: 1.2;
  font-size: 14px;
}

.advance-actions > .next-action {
  flex-grow: 2;
  min-height: 52px;
  font-size: 16px;
}

.explanation-action {
  min-height: 44px;
  margin-left: auto;
  padding: 4px 0 4px 8px;
  border: 0;
  color: var(--color-secondary-text);
  background: transparent;
  text-decoration: underline;
  font-size: 13px;
  font-weight: 750;
}

@media (min-width: 720px), (min-width: 540px) and (max-height: 480px) {
  .game-advance-bar {
    padding-inline: clamp(12px, 3vw, 24px);
  }

  .advance-inner {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .advance-copy {
    gap: 4px 12px;
  }

  .explanation-action {
    margin-left: 0;
  }

  .advance-actions {
    flex-wrap: nowrap;
    align-items: center;
  }

  .advance-actions > .button {
    flex: 0 0 auto;
    padding-inline: 18px;
  }

  .advance-actions > .next-action {
    min-width: clamp(128px, 19vw, 184px);
    font-size: 17px;
    padding-inline: 20px;
  }

}
</style>
