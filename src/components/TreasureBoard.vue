<script setup lang="ts">
import { computed, ref, nextTick, onBeforeUnmount } from 'vue'
import type { TreasureModeState } from '../domain/game-modes'
import { getTreasureCost, TREASURE_CHESTS, type TreasureId } from '../domain/treasure'
import { TREASURE_REWARDS } from '../presentation/treasure-rewards'
import TreasureArt from './TreasureArt.vue'

const props = withDefaults(defineProps<{
  state: TreasureModeState
  questionCount: number
  canOpen: boolean
  compact?: boolean
}>(), { compact: false })

const emit = defineEmits<{
  open: [treasureId: TreasureId]
  dialog: [visible: boolean]
}>()
const dialog = ref<InstanceType<typeof globalThis.HTMLDialogElement> | null>(null)
const visible = ref(false)
const chests = computed(() => TREASURE_CHESTS
  .slice(0, Math.min(TREASURE_CHESTS.length, props.questionCount))
  .map((chest) => ({
    ...chest,
    reward: TREASURE_REWARDS[chest.id],
    cost: getTreasureCost(chest.id, props.questionCount),
    opened: props.state.openedTreasures.includes(chest.id),
  })))
const availableCount = computed(() => chests.value.filter((chest) => isReady(chest.cost, chest.opened)).length)
const nextCost = computed(() => Math.min(...chests.value.filter(({ opened }) => !opened).map(({ cost }) => cost)))

function isReady(cost: number, opened: boolean): boolean {
  return props.canOpen && !opened && props.state.keysAvailable >= cost
}

function statusText(cost: number, opened: boolean): string {
  if (opened) return 'Conseguido'
  const missingKeys = cost - props.state.keysAvailable
  if (missingKeys <= 0) return props.canOpen ? 'Disponible' : 'Después de responder'
  return `Falta${missingKeys === 1 ? '' : 'n'} ${missingKeys} ${missingKeys === 1 ? 'llave' : 'llaves'}`
}

async function show(): Promise<void> {
  if (!props.canOpen || visible.value || !dialog.value || dialog.value.open) return
  visible.value = true
  emit('dialog', true)
  await nextTick()
  if (dialog.value && visible.value && !dialog.value.open) dialog.value.showModal()
}
function close(): void {
  dialog.value?.close()
}
function onClose(): void {
  visible.value = false
  emit('dialog', false)
}
function selectChest(id: TreasureId): void {
  const chest = chests.value.find((candidate) => candidate.id === id)
  if (!chest || !isReady(chest.cost, chest.opened)) return
  close()
  emit('open', id)
}
onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
})
defineExpose({ show })
</script>

<template>
  <section
    class="treasure-board treasure-route"
    :class="{ compact }"
    aria-label="Ruta de las reliquias"
  >
    <header class="treasure-route-header">
      <div>
        <p class="eyebrow">
          Ruta de las reliquias
        </p>
        <h2>{{ state.openedTreasures.length }} / {{ chests.length }} tesoros</h2>
      </div>
      <div
        class="key-balance"
        :aria-label="`${state.keysAvailable} llaves disponibles`"
      >
        <TreasureArt kind="key" />
        <strong>{{ state.keysAvailable }}</strong>
        <span>{{ state.keysAvailable === 1 ? 'llave' : 'llaves' }}</span>
      </div>
    </header>
    <ol
      class="relic-route-nodes"
      aria-label="Cámaras de la expedición"
    >
      <li
        v-for="chest in chests"
        :key="chest.id"
        class="relic-route-node"
        :class="{ opened: chest.opened, ready: isReady(chest.cost, chest.opened) }"
      >
        <span class="relic-route-icon">
          <TreasureArt :kind="chest.opened ? chest.id : 'closed-chest'" />
          <span
            v-if="chest.opened"
            class="relic-node-check"
            aria-hidden="true"
          >✓</span>
        </span>
        <strong>{{ chest.reward.title }}</strong>
        <small>{{ statusText(chest.cost, chest.opened) }}</small>
      </li>
    </ol>
    <div class="treasure-route-footer">
      <p v-if="state.openedTreasures.length === chests.length">
        ¡Todas las reliquias de esta misión!
      </p>
      <p v-else-if="availableCount">
        ¡Tienes {{ availableCount === 1 ? 'un cofre disponible' : availableCount + ' cofres disponibles' }}!
      </p>
      <p v-else-if="state.keysAvailable >= nextCost">
        Abre un cofre después de responder.
      </p>
      <p v-else>
        Consigue {{ nextCost - state.keysAvailable }} {{ nextCost - state.keysAvailable === 1 ? 'llave más' : 'llaves más' }} para el siguiente cofre.
      </p>
      <button
        v-if="canOpen && availableCount"
        class="button secondary treasure-vault-button"
        type="button"
        @click="show"
      >
        Abrir cofres →
      </button>
    </div>
  </section>

  <dialog
    ref="dialog"
    class="treasure-vault-dialog confirm-dialog"
    aria-labelledby="vault-title"
    @close="onClose"
  >
    <div
      v-if="visible"
      class="vault-shell"
    >
      <header class="vault-heading">
        <div>
          <p class="eyebrow">
            Ruta de las reliquias
          </p>
          <h2 id="vault-title">
            Cámara de reliquias
          </h2>
          <p>Elige qué tesoro quieres descubrir.</p>
        </div>
        <span class="key-balance">
          <TreasureArt kind="key" />
          <strong>{{ state.keysAvailable }}</strong> {{ state.keysAvailable === 1 ? 'llave' : 'llaves' }}
        </span>
      </header>
      <div class="vault-chests">
        <article
          v-for="chest in chests"
          :key="chest.id"
          class="vault-chest"
          :class="{ opened: chest.opened, ready: isReady(chest.cost, chest.opened) }"
        >
          <div class="vault-chest-art">
            <TreasureArt :kind="chest.opened ? chest.id : 'closed-chest'" />
          </div>
          <div class="vault-chest-copy">
            <h3>{{ chest.reward.title }}</h3>
            <p>{{ chest.reward.description }}</p>
            <button
              v-if="isReady(chest.cost, chest.opened)"
              class="button primary"
              type="button"
              :aria-label="`Abrir ${chest.reward.title} por ${chest.cost} ${chest.cost === 1 ? 'llave' : 'llaves'}`"
              @click="selectChest(chest.id)"
            >
              Abrir · {{ chest.cost }} {{ chest.cost === 1 ? 'llave' : 'llaves' }}
            </button>
            <span
              v-else
              class="vault-status"
            >
              {{ chest.opened ? '✓ Conseguido' : statusText(chest.cost, chest.opened) }}
            </span>
          </div>
        </article>
      </div>
      <footer class="vault-footer">
        <button
          class="button secondary"
          type="button"
          autofocus
          @click="close"
        >
          Guardar llaves y continuar →
        </button>
      </footer>
    </div>
  </dialog>
</template>
