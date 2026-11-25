<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import TreasureBoard from '../components/TreasureBoard.vue'
import { getGameStats } from '../domain/game'
import { isGameExercise } from '../domain/content'
import type { TreasureId } from '../domain/treasure'
import { contentService } from '../content/service'
import { gameSession, openActiveTreasure, restartActiveGame } from '../presentation/game-session'
import { announceTreasureOpened, treasureRewardScene } from '../presentation/game-feel'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const treasureError = ref('')
const result = computed(() => gameSession.value?.result ?? null)
const stats = computed(() => gameSession.value ? getGameStats(gameSession.value) : null)
const treasureState = computed(() => gameSession.value?.modeState.modeId === 'treasure'
  ? gameSession.value.modeState
  : null)
const percentage = computed(() => result.value?.totalQuestions
  ? Math.round((result.value.correctCount / result.value.totalQuestions) * 100)
  : 0)

async function restart() {
  if (!gameSession.value) return
  loading.value = true
  error.value = ''
  try {
    const catalog = await contentService.loadManifest()
    const subject = catalog.subjects.find(({ id }) => id === gameSession.value?.subjectId)
    const topic = subject?.topics.find(({ id }) => id === gameSession.value?.topicId)
    if (!subject || !topic) throw new Error('El contenido original ya no está en el catálogo.')
    const content = await contentService.loadPackage(subject, topic)
    restartActiveGame(content.exercises.filter(isGameExercise))
    await router.push({ name: 'play', params: route.params })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo reiniciar la partida.'
  } finally {
    loading.value = false
  }
}

function openChest(treasureId: TreasureId) {
  if (treasureRewardScene.value) return
  treasureError.value = ''
  try {
    openActiveTreasure(treasureId)
    announceTreasureOpened(treasureId)
  } catch (caught) {
    treasureError.value = caught instanceof Error ? caught.message : 'No se pudo abrir el cofre.'
  }
}
</script>

<template>
  <section
    v-if="result"
    class="screen"
    aria-labelledby="results-title"
  >
    <div class="card results-card">
      <p class="eyebrow">
        Expedición completada
      </p>
      <div
        class="score-ring"
        :style="{ '--score': `${percentage * 3.6}deg` }"
      >
        <strong>{{ percentage }}%</strong>
      </div>
      <h1 id="results-title">
        {{ result.correctCount }} de {{ result.totalQuestions }} correctas
      </h1>
      <div class="result-stats">
        <div class="metric"><span>⭐ Puntos</span><strong>{{ result.score }}</strong></div>
        <div class="metric"><span>🔥 Mejor racha</span><strong>{{ stats?.bestStreak }}</strong></div>
      </div>
      <TreasureBoard
        v-if="treasureState"
        :state="treasureState"
        :question-count="result.totalQuestions"
        :can-open="true"
        @open="openChest"
      />
      <p v-if="treasureError" class="error" role="alert">{{ treasureError }}</p>
      <p>{{ percentage >= 70 ? '¡Gran trabajo, explorador/a!' : 'Cada error te acerca a la respuesta. ¡Pruébalo otra vez!' }}</p>
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        class="button primary replay-button"
        type="button"
        :disabled="loading"
        @click="restart"
      >
        {{ loading ? 'Preparando...' : '¡Volver a jugar!' }}
      </button>
      <nav class="results-secondary-actions" aria-label="Otras opciones">
        <RouterLink class="button secondary" :to="{ name: 'review', params: route.params }">
          Revisar errores
        </RouterLink>
        <RouterLink class="button secondary" :to="{ name: 'choose-challenge', params: route.params }">
          Elegir otro reto
        </RouterLink>
        <RouterLink class="text-link" :to="{ name: 'home' }">Ir al inicio</RouterLink>
      </nav>
    </div>
  </section>
  <section
    v-else
    class="screen"
  >
    <p>No hay resultados de una partida finalizada.</p>
    <RouterLink
      class="button primary"
      :to="{ name: 'home' }"
    >Ir al inicio</RouterLink>
  </section>
</template>
