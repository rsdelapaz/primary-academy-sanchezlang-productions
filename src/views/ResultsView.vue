<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import MissionTrophy from '../components/MissionTrophy.vue'
import TreasureBoard from '../components/TreasureBoard.vue'
import CollectionDialog from '../components/CollectionDialog.vue'
import { getGameStats } from '../domain/game'
import { isGameExercise } from '../domain/content'
import type { TreasureId } from '../domain/treasure'
import { contentService } from '../content/service'
import { gameSession, openActiveTreasure, restartActiveGame } from '../presentation/game-session'
import { announceTreasureOpened, treasureRewardScene } from '../presentation/game-feel'
import { useThemePreference } from '../presentation/theme-preference'
import { getVictoryTier, VICTORY_TITLES } from '../presentation/victory-presentation'
import { localGameRecordsStore, type GameAchievement } from '../presentation/local-game-records'

const route = useRoute()
const router = useRouter()
const { focusMode } = useThemePreference()
const collection = ref<{ show: () => void } | null>(null)
const missionName = ref('')
const loading = ref(false)
const error = ref('')
const treasureError = ref('')
const result = computed(() => gameSession.value?.result ?? null)
const stats = computed(() => gameSession.value ? getGameStats(gameSession.value) : null)
const tier = computed(() => getVictoryTier(result.value?.correctCount ?? 0, result.value?.totalQuestions ?? 0))
const perfect = computed(() => tier.value === 'perfect')
const resultTitle = computed(() => VICTORY_TITLES[tier.value])
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
watch([result, focusMode], ([value]) => {
  if (scoreFrame) globalThis.cancelAnimationFrame(scoreFrame)
  if (!value) {
    animatedScore.value = 0
    return
  }
  if (focusMode.value || globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

onMounted(async () => {
  try {
    const catalog = await contentService.loadManifest()
    const subject = catalog.subjects.find(({ id }) => id === result.value?.subjectId)
    const topic = subject?.topics.find(({ id }) => id === result.value?.topicId)
    missionName.value = [subject?.title, topic?.title].filter(Boolean).join(' · ')
  } catch {
    // The end-of-game summary works even if the catalog is unavailable.
  }
})

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
    class="screen results-screen epic-results"
    :data-tier="tier"
    aria-labelledby="results-title"
  >
    <header class="victory-heading">
      <h1 id="results-title">
        {{ resultTitle }}
      </h1>
      <p v-if="missionName">
        {{ missionName }}
      </p>
    </header>
    <div class="victory-layout">
      <div
        class="victory-art-space"
        aria-hidden="true"
      >
        <MissionTrophy
          v-if="focusMode && perfect"
          class="mission-trophy"
        />
      </div>
      <div class="victory-report">
        <p
          v-if="achievement?.newPersonalRecord"
          class="victory-record"
          role="status"
        >
          ★ Nuevo récord personal
        </p>
        <div class="victory-score">
          <strong aria-hidden="true">{{ animatedScore }}</strong>
          <span class="sr-only">{{ result.score }}</span>
          <span>Puntos</span>
        </div>
        <dl class="victory-stats">
          <div><dt>Aciertos</dt><dd>{{ result.correctCount }}/{{ result.totalQuestions }}</dd></div>
          <div><dt>Racha</dt><dd>{{ stats?.bestStreak }}</dd></div>
          <div><dt>Precisión</dt><dd>{{ percentage }}%</dd></div>
        </dl>
        <div
          v-if="perfect && achievement?.perfectBadgeAwarded"
          class="victory-achievement"
        >
          <MissionTrophy aria-hidden="true" />
          <span><small>Insignia conseguida</small><strong>Misión perfecta</strong></span>
        </div>
        <p
          v-else
          class="victory-message"
        >
          {{ tier === 'epic' ? '¡Estuviste muy cerca de una misión perfecta!' : 'Cada respuesta te ayuda a aprender. Puedes repasar tus errores.' }}
        </p>
      </div>
    </div>
    <div
      v-if="treasureState"
      class="victory-treasures"
    >
      <TreasureBoard
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
    </div>
    <div class="victory-actions">
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        class="button primary victory-replay"
        type="button"
        :disabled="loading"
        @click="restart"
      >
        {{ loading ? 'Preparando...' : 'Siguiente misión' }} <span aria-hidden="true">→</span>
      </button>
      <nav
        class="victory-links"
        aria-label="Otras opciones"
      >
        <RouterLink
          v-if="!perfect"
          :to="{ name: 'review', params: route.params }"
        >Revisar errores</RouterLink>
        <button
          type="button"
          @click="collection?.show()"
        >
          Mi colección
        </button>
        <RouterLink :to="{ name: 'choose-challenge', params: route.params }">Otro reto</RouterLink>
        <RouterLink :to="{ name: 'home' }">Inicio</RouterLink>
      </nav>
    </div>
    <CollectionDialog ref="collection" />
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
