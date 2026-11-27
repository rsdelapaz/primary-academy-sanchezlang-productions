<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import CollectionGallery from './CollectionGallery.vue'
import { localGameRecordsStore, type GameCollection } from '../presentation/local-game-records'
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
const galleryVisible = ref(false)
const collection = ref<GameCollection>({ perfect: false, treasures: [] })
const galleryBack = ref<{ focus: () => void } | null>(null)
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

watch(gameFeelEvent, (event) => {
  if (!event) return
  activeEvent.value = event
  if (eventTimer !== undefined) globalThis.clearTimeout(eventTimer)
  eventTimer = globalThis.setTimeout(() => {
    if (activeEvent.value?.id === event.id) activeEvent.value = null
  }, event.kind === 'finish' ? 2400 : 1500)
})

watch(treasureRewardScene, async (scene) => {
  galleryVisible.value = false
  if (!scene) {
    if (rewardDialog.value?.open) rewardDialog.value.close()
    return
  }
  collection.value = localGameRecordsStore.getCollection()
  await nextTick()
  if (treasureRewardScene.value?.id !== scene.id || !rewardDialog.value) return
  if (!rewardDialog.value.open) rewardDialog.value.showModal()
  continueButton.value?.focus()
})

async function showGallery() {
  galleryVisible.value = true
  await nextTick()
  galleryBack.value?.focus()
}

async function closeGallery() {
  galleryVisible.value = false
  await nextTick()
  continueButton.value?.focus()
}

function cancelReward() {
  if (galleryVisible.value) void closeGallery()
  else continueAdventure()
}

function continueAdventure(): void {
  const scene = treasureRewardScene.value
  if (scene) dismissTreasureReward(scene.id)
}

onUnmounted(() => {
  if (eventTimer !== undefined) globalThis.clearTimeout(eventTimer)
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
    class="treasure-reward-scene relic-reveal-dialog"
    :aria-labelledby="galleryVisible ? 'reward-gallery-title' : 'treasure-reward-title'"
    @cancel.prevent="cancelReward"
  >
    <div
      v-if="reward && !galleryVisible"
      :key="reward.id"
      class="relic-reveal"
    >
      <div
        class="relic-reveal-art"
        aria-hidden="true"
      >
        <span class="relic-halo"></span>
        <TreasureArt
          class="relic-open-chest"
          kind="open-chest"
        />
        <TreasureArt
          class="relic-hero-item"
          :kind="reward.treasureId"
        />
      </div>
      <div class="relic-reveal-report">
        <p class="eyebrow">
          Cámara de reliquias
        </p>
        <span class="relic-recovered">✦ Reliquia recuperada</span>
        <h2 id="treasure-reward-title">
          {{ reward.title }}
        </h2>
        <p class="relic-reveal-description">
          {{ reward.description }}
        </p>
        <p class="relic-acquired">
          {{ reward.isNew ? 'Añadido a tu colección' : 'Ya forma parte de tu colección' }}
        </p>
        <span class="relic-count">{{ collection.treasures.length }} de {{ Object.keys(TREASURE_REWARDS).length }} reliquias</span>
        <button
          ref="continueButton"
          class="button primary reward-continue"
          type="button"
          @click="continueAdventure"
        >
          Continuar aventura →
        </button>
        <button
          class="relic-collection-link"
          type="button"
          @click="showGallery"
        >
          Ver colección
        </button>
      </div>
    </div>
    <div
      v-else-if="reward && galleryVisible"
      class="vault-shell reward-gallery"
    >
      <header class="vault-heading">
        <div>
          <p class="eyebrow">
            Sala de descubrimientos
          </p>
          <h2 id="reward-gallery-title">
            Mi colección
          </h2>
        </div>
      </header>
      <CollectionGallery :collection="collection" />
      <footer class="vault-footer">
        <button
          ref="galleryBack"
          class="button primary"
          type="button"
          @click="closeGallery"
        >
          Volver a mi reliquia
        </button>
      </footer>
    </div>
  </dialog>
</template>
