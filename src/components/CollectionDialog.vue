<script setup lang="ts">
import { ref } from 'vue'
import { TREASURE_CHESTS } from '../domain/treasure'
import { localGameRecordsStore, type GameCollection } from '../presentation/local-game-records'
import { TREASURE_REWARDS } from '../presentation/treasure-rewards'
import MissionTrophy from './MissionTrophy.vue'
import TreasureArt from './TreasureArt.vue'

const dialog = ref<InstanceType<typeof globalThis.HTMLDialogElement> | null>(null)
const collection = ref<GameCollection>({ perfect: false, treasures: [] })
function show(): void {
  collection.value = localGameRecordsStore.getCollection()
  dialog.value?.showModal()
}
defineExpose({ show })
</script>

<template>
  <dialog
    ref="dialog"
    class="collection-dialog confirm-dialog"
    aria-labelledby="collection-title"
  >
    <h2 id="collection-title">
      Mi colección
    </h2>
    <p class="collection-subtitle">
      Tesoros y hazañas de tus misiones · Guardados en este dispositivo
    </p>
    <p class="collection-count">
      {{ collection.treasures.length + Number(collection.perfect) }} de 4 descubiertos
    </p>
    <div class="collection-grid">
      <article :class="{ 'collection-locked': !collection.perfect }">
        <MissionTrophy />
        <strong>Misión perfecta</strong>
        <small>{{ collection.perfect ? 'Conseguido' : 'Acierta todas las preguntas' }}</small>
      </article>
      <article
        v-for="{ id } in TREASURE_CHESTS"
        :key="id"
        :class="{ 'collection-locked': !collection.treasures.includes(id) }"
      >
        <TreasureArt :kind="id" />
        <strong>{{ TREASURE_REWARDS[id].title }}</strong>
        <small>{{ collection.treasures.includes(id) ? 'Conseguido' : 'Abre su cofre en Tesoro' }}</small>
      </article>
    </div>
    <button
      type="button"
      class="button primary collection-close"
      autofocus
      @click="dialog?.close()"
    >
      Cerrar
    </button>
  </dialog>
</template>
