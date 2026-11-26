<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import MissionTrophy from '../components/MissionTrophy.vue'
import TreasureBoard from '../components/TreasureBoard.vue'
import UniverseArtwork from '../components/UniverseArtwork.vue'
import { getGameStats } from '../domain/game'
import { isGameExercise } from '../domain/content'
import type { TreasureId } from '../domain/treasure'
import { contentService } from '../content/service'
import { gameSession, openActiveTreasure, restartActiveGame } from '../presentation/game-session'
import { announceTreasureOpened, treasureRewardScene } from '../presentation/game-feel'
import { localGameRecordsStore, type GameAchievement } from '../presentation/local-game-records'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const treasureError = ref('')
const result = computed(() => gameSession.value?.result ?? null)
const stats = computed(() => gameSession.value ? getGameStats(gameSession.value) : null)
const perfect = computed(() => Boolean(result.value &&
  result.value.totalQuestions > 0 &&
  result.value.correctCount === result.value.totalQuestions))
const achievement = ref<GameAchievement | null>(null)
const animatedScore = ref(0)
const treasureState = computed(() => gameSession.value?.modeState.modeId === 'treasure'
  ? gameSession.value.modeState
  : null)
const percentage = computed(() => result.value?.totalQuestions
  ? Math.round((result.value.correctCount / result.value.totalQuestions) * 100)
  : 0)

watch(result, (value) => {
  achievement.value = value ? localGameRecordsStore.record(value) : null
}, { immediate: true })

let scoreFrame = 0
watch(result, (value) => {
  if (scoreFrame) globalThis.cancelAnimationFrame(scoreFrame)
  if (!value) {
    animatedScore.value = 0
    return
  }
  if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animatedScore.value = value.score
    return
  }
  const startedAt = globalThis.performance.now()
  const duration = 650
  const animateScore = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    animatedScore.value = Math.round(value.score * (1 - (1 - progress) ** 3))
    if (progress < 1) scoreFrame = globalThis.requestAnimationFrame(animateScore)
    else scoreFrame = 0
  }
  scoreFrame = globalThis.requestAnimationFrame(animateScore)
}, { immediate: true })

onUnmounted(() => {
  if (scoreFrame) globalThis.cancelAnimationFrame(scoreFrame)
})

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
    class="screen results-screen"
    :class="{ 'results-screen-perfect': perfect }"
    aria-labelledby="results-title"
  >
    <div
      class="card results-card"
      :class="{ 'results-perfect': perfect }"
    >
      <p class="eyebrow results-eyebrow">
        {{ perfect ? '¡MISIÓN PERFECTA!' : '¡MISIÓN COMPLETADA!' }}
      </p>
      <MissionTrophy
        v-if="perfect"
        class="mission-trophy"
      />
      <UniverseArtwork
        v-else
        class="results-art"
        scene="hero"
      />
      <div
        class="score-ring"
        :class="{ 'score-ring-perfect': perfect }"
        :style="{ '--score': `${percentage * 3.6}deg` }"
      >
        <strong>{{ percentage }}%</strong>
      </div>
      <h1 id="results-title">
        {{ perfect ? '¡Lo lograste todo!' : `${result.correctCount} de ${result.totalQuestions} correctas` }}
      </h1>
      <p
        v-if="perfect && achievement?.perfectBadgeAwarded"
        class="badge-earned"
      >
        Insignia de misión perfecta conseguida
      </p>
      <p
        v-if="achievement?.newPersonalRecord"
        class="personal-record"
        role="status"
      >
        ¡Nuevo récord personal! {{ achievement.personalBest }} puntos
      </p>
      <div class="result-stats">
        <div class="metric metric-score">
          <span>Puntos</span><strong class="result-score">{{ animatedScore }}</strong>
        </div>
        <div class="metric metric-streak">
          <span>Mejor racha</span><strong>{{ stats?.bestStreak }}</strong>
        </div>
      </div>
      <TreasureBoard
        v-if="treasureState"
        :state="treasureState"
        :question-count="result.totalQuestions"
        :can-open="true"
        @open="openChest"
      />
      <p
        v-if="treasureError"
        class="error"
        role="alert"
      >
        {{ treasureError }}
      </p>
      <p>{{ percentage >= 70 ? '¡Gran trabajo, explorador/a!' : 'Cada error te acerca a la respuesta. ¡Pruébalo otra vez!' }}</p>
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
      <p class="results-encouragement">
        {{ perfect ? '¡Tu precisión ha sido extraordinaria!' : 'Cada reto completado te hace avanzar. ¡Vamos a por el siguiente!' }}
      </p>
      <button
        class="button primary replay-button"
        type="button"
        :disabled="loading"
        @click="restart"
      >
        {{ loading ? 'Preparando...' : '¡Volver a jugar!' }}
      </button>
      <nav
        class="results-secondary-actions"
        aria-label="Otras opciones"
      >
        <RouterLink
          v-if="!perfect"
          class="button secondary"
          :to="{ name: 'review', params: route.params }"
        >
          Revisar errores
        </RouterLink>
        <RouterLink
          class="button secondary"
          :to="{ name: 'choose-challenge', params: route.params }"
        >
          Elegir otro reto
        </RouterLink>
        <RouterLink
          class="text-link"
          :to="{ name: 'home' }"
        >Ir al inicio</RouterLink>
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
