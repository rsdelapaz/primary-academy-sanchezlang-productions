<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import TreasureArt from './TreasureArt.vue'
import {
  dismissTreasureReward,
  gameFeelEvent,
  treasureRewardScene,
  type GameFeelEvent,
} from '../presentation/game-feel'
import { TREASURE_REWARDS } from '../presentation/treasure-rewards'

const activeEvent = ref<GameFeelEvent | null>(null)
const rewardDialog = ref<{ open: boolean; showModal: () => void; close: () => void } | null>(null)
const continueButton = ref<{ focus: () => void } | null>(null)
const rewardRevealed = ref(false)
const eventTitle = computed(() => {
  const event = activeEvent.value
  if (!event) return ''
  if (event.kind === 'finish') return '¡Expedición completada!'
  if (!event.correct) return 'Cada respuesta te enseña algo.'
  return event.streakMilestone ? `¡Racha de ${event.streak} aciertos!` : '¡Muy bien!'
})
const eventDetail = computed(() => {
  const event = activeEvent.value
  if (!event) return ''
  if (event.kind === 'finish') return `${event.correctCount} de ${event.totalQuestions} correctas · ${event.score} puntos`
  if (!event.correct) return 'Lee la explicación y vuelve a intentarlo.'
  return event.keyEarned ? '¡También ganaste una llave!' : 'Sigue explorando.'
})
const reward = computed(() => {
  const scene = treasureRewardScene.value
  return scene ? { ...scene, ...TREASURE_REWARDS[scene.treasureId] } : null
})

let eventTimer: ReturnType<typeof globalThis.setTimeout> | undefined
let revealTimer: ReturnType<typeof globalThis.setTimeout> | undefined

watch(gameFeelEvent, (event) => {
  if (!event) return
  activeEvent.value = event
  if (eventTimer !== undefined) globalThis.clearTimeout(eventTimer)
  eventTimer = globalThis.setTimeout(() => {
    if (activeEvent.value?.id === event.id) activeEvent.value = null
  }, event.kind === 'finish' ? 2400 : 1500)
})

watch(treasureRewardScene, async (scene) => {
  if (revealTimer !== undefined) globalThis.clearTimeout(revealTimer)
  revealTimer = undefined
  rewardRevealed.value = false
  if (!scene) {
    if (rewardDialog.value?.open) rewardDialog.value.close()
    return
  }

  await nextTick()
  if (treasureRewardScene.value?.id !== scene.id || !rewardDialog.value) return
  if (!rewardDialog.value.open) rewardDialog.value.showModal()
  if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealReward()
    return
  }
  revealTimer = globalThis.setTimeout(revealReward, 1050)
})

function revealReward(): void {
  if (!treasureRewardScene.value) return
  if (revealTimer !== undefined) globalThis.clearTimeout(revealTimer)
  revealTimer = undefined
  rewardRevealed.value = true
  void nextTick(() => continueButton.value?.focus())
}

function continueAdventure(): void {
  const scene = treasureRewardScene.value
  if (scene) dismissTreasureReward(scene.id)
}

onUnmounted(() => {
  if (eventTimer !== undefined) globalThis.clearTimeout(eventTimer)
  if (revealTimer !== undefined) globalThis.clearTimeout(revealTimer)
  if (rewardDialog.value?.open) rewardDialog.value.close()
})
</script>

<template>
  <div
    v-if="activeEvent"
    :key="activeEvent.id"
    class="game-feel-toast"
    :class="{
      correct: activeEvent.kind === 'answer' && activeEvent.correct,
      incorrect: activeEvent.kind === 'answer' && !activeEvent.correct,
      finished: activeEvent.kind === 'finish',
      'streak-milestone': activeEvent.kind === 'answer' && activeEvent.streakMilestone,
    }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span
      class="game-feel-mark"
      aria-hidden="true"
    >
      {{ activeEvent.kind === 'finish' ? '★' : activeEvent.kind === 'answer' && activeEvent.correct ? '✓' : '↻' }}
    </span>
    <span class="game-feel-copy">
      <strong>{{ eventTitle }}</strong>
      <span>{{ eventDetail }}</span>
    </span>
    <strong
      v-if="activeEvent.kind === 'answer' && activeEvent.correct"
      class="game-feel-points"
    >
      +{{ activeEvent.points }}
    </strong>
    <TreasureArt
      v-if="activeEvent.kind === 'answer' && activeEvent.keyEarned"
      class="game-feel-key"
      kind="key"
      label="Llave conseguida"
    />
  </div>

  <dialog
    ref="rewardDialog"
    class="treasure-reward-scene"
    aria-labelledby="treasure-reward-title"
    @cancel.prevent="revealReward"
  >
    <div
      v-if="reward"
      class="treasure-reward-content"
    >
      <p class="eyebrow">
        ¡Cofre abierto!
      </p>
      <div
        class="reward-stage"
        :class="{ revealed: rewardRevealed }"
        aria-hidden="true"
      >
        <TreasureArt
          class="reward-chest-closed"
          kind="closed-chest"
        />
        <TreasureArt
          class="reward-chest-open"
          kind="open-chest"
        />
        <TreasureArt
          class="reward-item-art"
          :kind="reward.treasureId"
        />
      </div>
      <h2 id="treasure-reward-title">
        {{ rewardRevealed ? reward.title : '¿Qué habrá dentro?' }}
      </h2>
      <p>{{ rewardRevealed ? reward.description : '¡Tu aventura te ha traído una sorpresa!' }}</p>
      <button
        v-if="!rewardRevealed"
        class="button secondary reward-skip"
        type="button"
        autofocus
        @click="revealReward"
      >
        Saltar animación
      </button>
      <button
        v-else
        ref="continueButton"
        class="button primary reward-continue"
        type="button"
        @click="continueAdventure"
      >
        ¡Continuar mi aventura!
      </button>
    </div>
  </dialog>
</template>
