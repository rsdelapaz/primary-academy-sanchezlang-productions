<script setup lang="ts">
import { computed } from 'vue'
import type { TreasureModeState } from '../domain/game-modes'
import { getTreasureCost, TREASURE_CHESTS, type TreasureId } from '../domain/treasure'

const props = defineProps<{
  state: TreasureModeState
  questionCount: number
  canOpen: boolean
}>()

const emit = defineEmits<{
  open: [treasureId: TreasureId]
}>()

const rewards: Record<TreasureId, { title: string; description: string }> = {
  'star-crystal': { title: 'Cristal estelar', description: 'Un brillo para tu colección' },
  'golden-compass': { title: 'Brújula dorada', description: 'Guía para nuevas aventuras' },
  'moon-crown': { title: 'Corona lunar', description: 'El tesoro más brillante' },
}

const chests = computed(() => TREASURE_CHESTS.map((chest) => ({
  ...chest,
  reward: rewards[chest.id],
  cost: getTreasureCost(chest.id, props.questionCount),
  opened: props.state.openedTreasures.includes(chest.id),
})))

function isDisabled(cost: number, opened: boolean): boolean {
  return !props.canOpen || opened || props.state.keysAvailable < cost
}
</script>

<template>
  <section class="treasure-board" aria-labelledby="treasure-board-title">
    <header class="treasure-board-header">
      <div>
        <p class="eyebrow">Misión del Tesoro</p>
        <h2 id="treasure-board-title">Elige tu cofre</h2>
      </div>
      <div class="key-balance" :aria-label="`${state.keysAvailable} llaves disponibles`">
        <span aria-hidden="true">🔑</span>
        <strong>{{ state.keysAvailable }}</strong>
      </div>
    </header>

    <p v-if="!canOpen" class="treasure-hint">
      Gana una llave por cada acierto. Puedes abrir cofres después de responder.
    </p>
    <div class="treasure-grid">
      <article
        v-for="chest in chests"
        :key="chest.id"
        class="treasure-card"
        :class="{ opened: chest.opened }"
      >
        <button
          class="treasure-open"
          type="button"
          :disabled="isDisabled(chest.cost, chest.opened)"
          :aria-label="chest.opened
            ? `${chest.reward.title}, conseguido`
            : `Abrir ${chest.reward.title} por ${chest.cost} llaves`"
          @click="emit('open', chest.id)"
        >
          <svg class="treasure-art" viewBox="0 0 64 64" aria-hidden="true">
            <template v-if="chest.id === 'star-crystal'">
              <path d="m32 5 8 18 19 2-14 13 4 20-17-10-17 10 4-20L5 25l19-2z" fill="var(--color-accent)" />
              <path d="m32 14 5 13 13 2-10 9 3 14-11-7z" fill="var(--color-surface)" />
            </template>
            <template v-else-if="chest.id === 'golden-compass'">
              <circle cx="32" cy="32" r="26" fill="var(--color-reward)" />
              <path d="m40 20-5 17-17 7 6-17z" fill="var(--color-primary)" />
              <circle cx="32" cy="32" r="4" fill="var(--color-surface)" />
            </template>
            <template v-else>
              <path d="m9 45-3-24 15 11 11-20 11 20 15-11-3 24z" fill="var(--color-accent-secondary)" />
              <path d="M12 50h40" stroke="var(--color-reward)" stroke-width="6" stroke-linecap="round" />
              <circle cx="32" cy="16" r="4" fill="var(--color-reward)" />
            </template>
          </svg>
          <strong>{{ chest.reward.title }}</strong>
          <span>{{ chest.opened ? 'Tesoro conseguido' : `${chest.cost} ${chest.cost === 1 ? 'llave' : 'llaves'}` }}</span>
        </button>
      </article>
    </div>
    <p class="treasure-disclaimer">
      {{ state.openedTreasures.length }} de 3 tesoros conseguidos · Los cofres no cambian tu puntuación.
    </p>
  </section>
</template>
