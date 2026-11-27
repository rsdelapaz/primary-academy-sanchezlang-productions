<script setup lang="ts">
import '../treasure-experience.css'
import { TREASURE_CHESTS } from '../domain/treasure'
import type { GameCollection } from '../presentation/local-game-records'
import { TREASURE_REWARDS } from '../presentation/treasure-rewards'
import MissionTrophy from './MissionTrophy.vue'
import TreasureArt from './TreasureArt.vue'
defineProps<{ collection: GameCollection }>()
const total = TREASURE_CHESTS.length + 1
</script>

<template>
  <div class="relic-gallery">
    <p class="collection-count">
      {{ collection.treasures.length + Number(collection.perfect) }} de {{ total }} descubrimientos
    </p>
    <div
      class="collection-track"
      role="progressbar"
      aria-label="Colección"
      :aria-valuemax="total"
      :aria-valuemin="0"
      :aria-valuenow="collection.treasures.length + Number(collection.perfect)"
    >
      <span :style="{ width: `${(collection.treasures.length + Number(collection.perfect)) / total * 100}%` }"></span>
    </div>
    <div class="relic-gallery-grid">
      <article
        v-for="{ id } in TREASURE_CHESTS"
        :key="id"
        class="relic-display"
        :class="{ 'collection-locked': !collection.treasures.includes(id) }"
      >
        <div class="relic-display-art">
          <TreasureArt :kind="id" />
        </div>
        <strong>{{ TREASURE_REWARDS[id].title }}</strong>
        <small>{{ collection.treasures.includes(id) ? '✓ Descubierto' : 'Por descubrir · Abre su cofre' }}</small>
      </article>
      <article
        class="relic-display"
        :class="{ 'collection-locked': !collection.perfect }"
      >
        <div class="relic-display-art">
          <MissionTrophy />
        </div>
        <strong>Misión perfecta</strong>
        <small>{{ collection.perfect ? '✓ Conseguido' : 'Acierta todas las preguntas' }}</small>
      </article>
    </div>
  </div>
</template>
