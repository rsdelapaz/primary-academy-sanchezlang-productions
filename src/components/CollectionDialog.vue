<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { localGameRecordsStore, type GameCollection } from '../presentation/local-game-records'
import CollectionGallery from './CollectionGallery.vue'

const dialog = ref<InstanceType<typeof globalThis.HTMLDialogElement> | null>(null)
const collection = ref<GameCollection>({ perfect: false, treasures: [] })
const visible = ref(false)
async function show(): Promise<void> {
  collection.value = localGameRecordsStore.getCollection()
  visible.value = true
  await nextTick()
  if (dialog.value && !dialog.value.open && visible.value) dialog.value.showModal()
}
defineExpose({ show })
</script>

<template>
  <dialog
    ref="dialog"
    class="collection-dialog treasure-vault-dialog confirm-dialog"
    aria-labelledby="collection-title"
    @close="visible = false"
  >
    <div
      v-if="visible"
      class="vault-shell"
    >
      <header class="vault-heading">
        <div>
          <p class="eyebrow">
            Sala de descubrimientos
          </p>
          <h2 id="collection-title">
            Mi colección
          </h2>
          <p>Tus reliquias y hazañas en este dispositivo.</p>
        </div>
      </header>
      <CollectionGallery :collection="collection" />
      <footer class="vault-footer">
        <button
          class="button primary collection-close"
          type="button"
          autofocus
          @click="dialog?.close()"
        >
          Cerrar colección
        </button>
      </footer>
    </div>
  </dialog>
</template>
