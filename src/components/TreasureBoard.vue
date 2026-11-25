<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TreasureModeState } from '../domain/game-modes'
import { getTreasureCost, TREASURE_CHESTS, type TreasureId } from '../domain/treasure'
import { TREASURE_REWARDS } from '../presentation/treasure-rewards'
import TreasureArt from './TreasureArt.vue'

const props = withDefaults(defineProps<{
  state: TreasureModeState
  questionCount: number
  canOpen: boolean
  compact?: boolean
}>(), {
  compact: false,
})

const emit = defineEmits<{
  open: [treasureId: TreasureId]
}>()

const newlyEarnedKeyCount = ref(0)
const chests = computed(() => TREASURE_CHESTS
  .slice(0, Math.min(TREASURE_CHESTS.length, props.questionCount))
  .map((chest) => ({
    ...chest,
    reward: TREASURE_REWARDS[chest.id],
    cost: getTreasureCost(chest.id, props.questionCount),
    opened: props.state.openedTreasures.includes(chest.id),
  })))

watch(() => props.state.keysAvailable, (available, previous) => {
  if (available > previous) newlyEarnedKeyCount.value = available
})

function isReady(cost: number, opened: boolean): boolean {
  return props.canOpen && !opened && props.state.keysAvailable >= cost
}

function statusText(cost: number, opened: boolean): string {
  if (opened) return 'Conseguido'
  if (isReady(cost, opened)) return '¡Puedes abrir!'
  if (!props.canOpen) return `Coste ${cost} · tras responder`
  const missingKeys = cost - props.state.keysAvailable
  return `Falta${missingKeys === 1 ? '' : 'n'} ${missingKeys} ${missingKeys === 1 ? 'llave' : 'llaves'}`
}
</script>

<template>
  <section
    class="treasure-board"
    :class="{ compact }"
    aria-labelledby="treasure-board-title"
  >
    <header class="treasure-board-header">
      <div>
        <p class="eyebrow">Misión del Tesoro</p>
        <h2 id="treasure-board-title">{{ compact ? 'Inventario' : 'Tus tesoros' }}</h2>
      </div>
      <div class="key-balance" :aria-label="`${state.keysAvailable} llaves disponibles`">
        <span class="key-pile" aria-hidden="true">
          <TreasureArt
            v-for="keyIndex in state.keysAvailable"
            :key="keyIndex"
            kind="key"
            class="inventory-key"
            :class="{ 'new-key': keyIndex === newlyEarnedKeyCount }"
          />
        </span>
        <strong>{{ state.keysAvailable }}</strong>
        <span>llaves</span>
      </div>
    </header>

    <div class="treasure-grid" role="group" aria-label="Cofres del tesoro">
      <article
        v-for="chest in chests"
        :key="chest.id"
        class="treasure-card"
        :class="{ opened: chest.opened, ready: isReady(chest.cost, chest.opened) }"
      >
        <button
          class="treasure-open"
          type="button"
          :disabled="!canOpen || chest.opened || state.keysAvailable < chest.cost"
          :aria-label="chest.opened
            ? `${chest.reward.title}, conseguido`
            : `Abrir ${chest.reward.title} por ${chest.cost} ${chest.cost === 1 ? 'llave' : 'llaves'}`"
          @click="emit('open', chest.id)"
        >
          <TreasureArt
            :kind="chest.opened ? chest.id : 'closed-chest'"
            class="treasure-chest-art"
          />
          <strong>{{ chest.reward.title }}</strong>
          <span class="treasure-status">{{ statusText(chest.cost, chest.opened) }}</span>
        </button>
      </article>
    </div>
    <p class="treasure-disclaimer">
      {{ state.openedTreasures.length }} de {{ chests.length }} tesoros conseguidos · No cambian tu puntuación.
    </p>
  </section>
</template>
