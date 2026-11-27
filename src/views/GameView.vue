<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import GameAdvanceBar from '../components/GameAdvanceBar.vue'
import TreasureBoard from '../components/TreasureBoard.vue'
import TypedAnswerInput from '../components/TypedAnswerInput.vue'
import {
  getCurrentQuestion,
  getGameStats,
  type GameAnswerResponse,
  type SessionAnswer,
} from '../domain/game'
import { getTreasureCost, TREASURE_CHESTS, type TreasureId } from '../domain/treasure'
import { abandonActiveGame, advanceActiveQuestion, answerActiveQuestion, gameAutoAdvanceEnabled, gameSession, openActiveTreasure } from '../presentation/game-session'
import {
  announceGameAnswer,
  announceGameFinished,
  announceTreasureOpened,
  treasureRewardScene,
} from '../presentation/game-feel'
import { getQuestionHistoryKey } from '../application/question-selection'
import { questionHistoryStore } from '../presentation/question-history-storage'
import { createAutoAdvance, type AutoAdvanceState } from '../presentation/auto-advance'

const route = useRoute()
const router = useRouter()
const error = ref('')
const treasureError = ref('')
const abandonDialog = ref<InstanceType<typeof globalThis.HTMLDialogElement> | null>(null)
const abandonDialogOpen = ref(false)
const pageHidden = ref(globalThis.document.hidden)
const pausedByPlayer = ref(false)
const advancing = ref(false)
const barHeight = ref(152)
const advanceBar = ref<{ focusNext: () => void } | null>(null)
const questionTitle = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
const feedbackPanel = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const treasurePanel = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const current = computed(() => gameSession.value ? getCurrentQuestion(gameSession.value) : undefined)
const answered = computed(() => gameSession.value?.status === 'active' && gameSession.value.phase === 'feedback')
const stats = computed(() => gameSession.value ? getGameStats(gameSession.value) : null)
const treasureState = computed(() => gameSession.value?.modeState.modeId === 'treasure'
  ? gameSession.value.modeState
  : null)
const currentAnswer = computed<SessionAnswer | undefined>(() => {
  const game = gameSession.value
  const question = current.value
  if (!game || !question || !answered.value) return undefined
  return game.answers.find((answer) => answer.exerciseId === question.exercise.id)
})
const correction = computed(() => {
  const question = current.value
  if (!question || currentAnswer.value?.correct) return ''
  return question.type === 'typed_answer'
    ? question.exercise.acceptedAnswers[0] ?? ''
    : question.exercise.options.find(({ id }) => id === question.exercise.correctOptionId)?.text ?? ''
})
const feedbackSummary = computed(() => {
  const explanation = current.value?.exercise.explanation ?? ''
  return answered.value && currentAnswer.value?.correct && explanation.length <= 65 && !explanation.includes('\n') ? explanation : ''
})
const progressSteps = computed(() => gameSession.value?.questions.map((question, index) => {
  const answer = gameSession.value?.answers.find(({ exerciseId }) => exerciseId === question.exercise.id)
  const status = answer ? (answer.correct ? 'correct' : 'attempted') :
    index === gameSession.value?.currentQuestionIndex ? 'current' : 'pending'
  return { id: question.exercise.id, status }
}) ?? [])
const selectedOptionId = computed(() => {
  const answer = currentAnswer.value
  return answer?.type === 'single_choice' ? answer.selectedOptionId : null
})
const options = computed(() => {
  const question = current.value
  if (!question || question.type !== 'single_choice') return []
  return question.optionIds.map((id) => ({
    id,
    text: question.exercise.options.find((option) => option.id === id)?.text ?? '',
  }))
})
const displayKey = computed(() => {
  const game = gameSession.value
  const question = current.value
  return game && question
    ? `${game.id}:${game.currentQuestionIndex}:${question.exercise.id}`
    : ''
})
const feedbackKey = computed(() => answered.value ? displayKey.value : null)
const blockedByTreasure = computed(() => {
  const session = gameSession.value
  const treasure = treasureState.value
  if (!answered.value || !session || !treasure) return false
  return TREASURE_CHESTS.slice(0, Math.min(TREASURE_CHESTS.length, session.questions.length))
    .some(({ id }) => !treasure.openedTreasures.includes(id) &&
      treasure.keysAvailable >= getTreasureCost(id, session.questions.length))
})
const blockedByDialog = computed(() => abandonDialogOpen.value || Boolean(treasureRewardScene.value))
const timerBlocked = computed(() =>
  pausedByPlayer.value || pageHidden.value || blockedByDialog.value || blockedByTreasure.value || advancing.value,
)
const autoAdvanceState = ref<AutoAdvanceState>({
  status: 'idle',
  feedbackKey: null,
  remainingMs: 0,
  remainingSeconds: 0,
})
const autoAdvance = createAutoAdvance({
  onTick: (state) => { autoAdvanceState.value = state },
  onAdvance: (key) => {
    if (!timerBlocked.value && !globalThis.document.hidden && gameAutoAdvanceEnabled.value) void nextQuestion(key)
  },
})

watch(feedbackKey, (key) => {
  pausedByPlayer.value = false
  if (key) void nextTick(() => {
    if (feedbackKey.value === key) advanceBar.value?.focusNext()
  })
}, { flush: 'sync' })

watch([feedbackKey, gameAutoAdvanceEnabled, timerBlocked, currentAnswer], () => {
  autoAdvance.update({
    feedbackKey: feedbackKey.value,
    enabled: gameAutoAdvanceEnabled.value,
    blocked: timerBlocked.value,
    delayMs: currentAnswer.value?.correct ? 3000 : 8000,
  })
}, { immediate: true })

function syncVisibility() {
  pageHidden.value = globalThis.document.hidden
}

function toggleAdvancePause() {
  pausedByPlayer.value = !pausedByPlayer.value
}

function showExplanation() {
  if (gameAutoAdvanceEnabled.value) pausedByPlayer.value = true
  scrollToPanel(feedbackPanel.value)
}

function scrollToPanel(panel: InstanceType<typeof globalThis.HTMLElement> | null) {
  panel?.focus({ preventScroll: true })
  panel?.scrollIntoView({ block: 'center', behavior: 'auto' })
}

function focusQuestion() {
  globalThis.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  questionTitle.value?.focus({ preventScroll: true })
}

let lastRecordedDisplayKey = ''

function recordDisplayedQuestion(): void {
  const game = gameSession.value
  const question = current.value
  if (!game || !question || !displayKey.value || displayKey.value === lastRecordedDisplayKey) return
  lastRecordedDisplayKey = displayKey.value
  questionHistoryStore.recordShown(
    getQuestionHistoryKey(game.subjectId, game.topicId, question.exercise),
  )
}

onMounted(() => {
  recordDisplayedQuestion()
  syncVisibility()
  globalThis.document.addEventListener('visibilitychange', syncVisibility)
  focusQuestion()
})
watch(displayKey, (key, previous) => {
  recordDisplayedQuestion()
  if (key && key !== previous && gameSession.value?.status === 'active') focusQuestion()
}, { flush: 'post' })
onBeforeRouteLeave(() => { autoAdvance.cancel() })
onBeforeUnmount(() => {
  autoAdvance.dispose()
  globalThis.document.removeEventListener('visibilitychange', syncVisibility)
})

function submitAnswer(response: GameAnswerResponse) {
  const question = current.value
  if (!question) return
  try {
    error.value = ''
    const previous = gameSession.value
    const updated = answerActiveQuestion(question.exercise.id, response)
    const answer = updated.answers[updated.answers.length - 1]
    if (!answer) throw new Error('No se pudo leer el resultado de la respuesta.')
    const previousKeys = previous?.modeState.modeId === 'treasure' ? previous.modeState.keysAvailable : 0
    const currentKeys = updated.modeState.modeId === 'treasure' ? updated.modeState.keysAvailable : 0
    announceGameAnswer({
      correct: answer.correct,
      points: answer.points,
      streak: getGameStats(updated).currentStreak,
      keyEarned: currentKeys > previousKeys,
    })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo evaluar la respuesta.'
  }
}

function choose(optionId: string) {
  if (current.value?.type !== 'single_choice') return
  submitAnswer({ type: 'single_choice', optionId })
}

function submitWrittenAnswer(text: string) {
  if (current.value?.type !== 'typed_answer') return
  submitAnswer({ type: 'typed_answer', text })
}

async function nextQuestion(expectedKey = feedbackKey.value) {
  if (!expectedKey || expectedKey !== feedbackKey.value || advancing.value || blockedByDialog.value) return
  autoAdvance.cancel()
  advancing.value = true
  try {
    error.value = ''
    const updated = advanceActiveQuestion()
    if (updated.status === 'completed') {
      if (updated.result) {
        announceGameFinished({
          score: updated.result.score,
          correctCount: updated.result.correctCount,
          totalQuestions: updated.result.totalQuestions,
        })
      }
      await router.push({ name: 'results', params: route.params })
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo avanzar.'
  } finally {
    advancing.value = false
  }
}

async function abandon() {
  try {
    autoAdvance.cancel()
    abandonActiveGame()
    abandonDialog.value?.close()
    await router.replace({ name: 'home' })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo abandonar la partida.'
  }
}

function requestAbandon() {
  if (!abandonDialog.value) return
  abandonDialogOpen.value = true
  abandonDialog.value.showModal()
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
    v-if="gameSession && current"
    class="screen game-screen"
    :class="{ 'has-advance-bar': answered }"
    :style="{ '--game-advance-height': barHeight + 'px' }"
    aria-labelledby="question-title"
  >
    <div class="game-hud">
      <div class="game-header">
        <span class="game-stage-label">
          <span aria-hidden="true">MISIÓN</span>
          <strong>{{ String(gameSession.currentQuestionIndex + 1).padStart(2, '0') }}</strong>
          <span aria-hidden="true">/ {{ String(gameSession.questions.length).padStart(2, '0') }}</span>
          <span class="sr-only">Pregunta {{ gameSession.currentQuestionIndex + 1 }} de {{ gameSession.questions.length }}</span>
        </span>
        <button
          class="game-exit-button"
          type="button"
          @click="requestAbandon"
        >
          <span aria-hidden="true">↗</span> Salir
        </button>
      </div>
      <div
        class="game-metrics"
        aria-label="Tu partida"
      >
        <div class="metric metric-score">
          <span>Puntos</span><strong>{{ stats?.score }}</strong>
          <span
            v-if="answered && currentAnswer?.correct"
            :key="displayKey"
            class="score-gain"
            aria-hidden="true"
          >+{{ currentAnswer.points }}</span>
        </div>
        <div class="metric metric-streak">
          <span>Racha</span><strong>{{ stats?.currentStreak }}</strong>
          <span
            v-if="answered && currentAnswer?.correct && [3, 5, 10, 20].includes(stats?.currentStreak ?? 0)"
            :key="displayKey"
            class="streak-banner"
            aria-hidden="true"
          >¡Racha de {{ stats?.currentStreak }}!</span>
        </div>
      </div>
      <div
        class="game-progress-steps"
        role="progressbar"
        aria-label="Progreso del reto"
        aria-valuemin="0"
        :aria-valuemax="stats?.totalQuestions ?? 1"
        :aria-valuenow="stats?.answeredCount ?? 0"
        :aria-valuetext="`${stats?.answeredCount ?? 0} de ${stats?.totalQuestions ?? 0} retos completados`"
      >
        <span
          v-for="step in progressSteps"
          :key="step.id"
          :class="`progress-step ${step.status}`"
          aria-hidden="true"
        >{{ step.status === 'correct' ? '✓' : step.status === 'attempted' ? '·' : '' }}</span>
      </div>
    </div>
    <article
      :key="current.exercise.id"
      class="card question-card game-question-card"
      :class="{ 'question-correct': answered && currentAnswer?.correct, 'question-answered': answered }"
    >
      <p
        v-if="current.exercise.context"
        class="context"
      >
        {{ current.exercise.context }}
      </p>
      <h1
        id="question-title"
        ref="questionTitle"
        tabindex="-1"
        :lang="current.exercise.exerciseLanguage"
      >
        {{ current.exercise.prompt }}
      </h1>
      <div
        v-if="current.type === 'single_choice'"
        class="options"
        role="group"
        aria-label="Opciones de respuesta"
      >
        <button
          v-for="(option, index) in options"
          :key="option.id"
          type="button"
          class="option"
          :class="{
            selected: selectedOptionId === option.id,
            correct: answered && current.type === 'single_choice' && option.id === current.exercise.correctOptionId,
            wrong: answered && selectedOptionId === option.id && current.type === 'single_choice' && option.id !== current.exercise.correctOptionId,
          }"
          :disabled="answered"
          @click="choose(option.id)"
        >
          <span
            class="option-key"
            aria-hidden="true"
          >{{ String.fromCharCode(65 + index) }}</span>
          <span
            class="option-text"
            :lang="current.exercise.exerciseLanguage"
          >{{ option.text }}</span>
          <span
            class="option-indicator"
            aria-hidden="true"
          >
            {{ answered && option.id === current.exercise.correctOptionId ? '✓' : answered && option.id === selectedOptionId ? '×' : '' }}
          </span>
          <span
            v-if="answered && option.id === current.exercise.correctOptionId"
            class="sr-only"
          >Respuesta correcta</span>
          <span
            v-else-if="answered && option.id === selectedOptionId"
            class="sr-only"
          >Tu respuesta</span>
        </button>
      </div>
      <TypedAnswerInput
        v-else
        :key="current.exercise.id"
        :disabled="answered"
        @submit="submitWrittenAnswer"
      />
      <div
        v-if="answered"
        ref="feedbackPanel"
        class="feedback"
        :class="{ success: currentAnswer?.correct }"
        tabindex="-1"
        role="status"
      >
        <strong>{{ currentAnswer?.correct ? '¡Muy bien! Sigue explorando.' : 'Casi lo tienes. Aprende con este detalle.' }}</strong>
        <template v-if="current.type === 'typed_answer' && currentAnswer?.type === 'typed_answer'">
          <p><strong>Tu respuesta:</strong> <span class="submitted-answer">{{ currentAnswer.submittedAnswer }}</span></p>
          <p><strong>Respuesta aceptada:</strong> {{ current.exercise.acceptedAnswers.join(' / ') }}</p>
        </template>
        <p :lang="current.exercise.explanationLanguage">
          {{ current.exercise.explanation }}
        </p>
      </div>
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
    </article>
    <div
      v-if="treasureState"
      ref="treasurePanel"
      class="game-treasure-panel"
      tabindex="-1"
    >
      <TreasureBoard
        :state="treasureState"
        :question-count="gameSession.questions.length"
        :can-open="answered"
        compact
        @open="openChest"
      />
    </div>
    <p
      v-if="treasureError"
      class="error"
      role="alert"
    >
      {{ treasureError }}
    </p>
  </section>
  <section
    v-else
    class="screen"
  >
    <p>No hay una partida activa.</p>
    <RouterLink
      class="button primary"
      :to="{ name: 'home' }"
    >Ir al inicio</RouterLink>
  </section>
  <GameAdvanceBar
    v-if="gameSession && current && answered"
    ref="advanceBar"
    :automatic="gameAutoAdvanceEnabled && autoAdvanceState.status !== 'finished'"
    :seconds="autoAdvanceState.remainingSeconds"
    :paused="pausedByPlayer || pageHidden || blockedByDialog"
    :blocked-by-treasure="blockedByTreasure"
    :final-question="gameSession.currentQuestionIndex + 1 === gameSession.questions.length"
    :disabled="advancing || blockedByDialog"
    :correct="currentAnswer?.correct ?? false"
    :correction="correction"
    :summary="feedbackSummary"
    :summary-language="current.exercise.explanationLanguage"
    :correction-language="current.exercise.exerciseLanguage"
    @next="nextQuestion()"
    @toggle-pause="toggleAdvancePause"
    @height="barHeight = $event"
    @show-treasures="scrollToPanel(treasurePanel)"
    @show-explanation="showExplanation"
  />
  <dialog
    ref="abandonDialog"
    class="confirm-dialog"
    aria-labelledby="abandon-title"
    @close="abandonDialogOpen = false"
  >
    <h2 id="abandon-title">
      ¿Quieres salir del reto?
    </h2>
    <p>La partida actual se cerrará. Puedes volver a empezar cuando quieras.</p>
    <div class="confirm-actions">
      <button
        class="button secondary"
        type="button"
        autofocus
        @click="abandonDialog?.close()"
      >
        Seguir jugando
      </button>
      <button
        class="button primary"
        type="button"
        @click="abandon"
      >
        Salir al inicio
      </button>
    </div>
  </dialog>
</template>
