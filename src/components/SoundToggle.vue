<script setup lang="ts">
import { setSoundEnabled, soundEnabled, soundUnavailable } from '../presentation/sound-effects'

function toggleSound(): void {
  setSoundEnabled(!soundEnabled.value)
}
</script>

<template>
  <div class="sound-control">
    <button
      class="sound-toggle"
      type="button"
      :aria-label="soundEnabled ? 'Desactivar sonidos' : 'Activar sonidos'"
      :aria-pressed="soundEnabled"
      @click="toggleSound"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" />
        <path v-if="soundEnabled" d="M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
        <path v-else d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
      </svg>
      <span>{{ soundEnabled ? 'Sonido' : 'Sin sonido' }}</span>
    </button>
    <span v-if="soundUnavailable" class="sound-unavailable" role="status">
      Sonido no disponible. Puedes seguir jugando sin audio.
    </span>
  </div>
</template>
