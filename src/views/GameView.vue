<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import TreasureBoard from '../components/TreasureBoard.vue'
import TypedAnswerInput from '../components/TypedAnswerInput.vue'
import UniverseArtwork from '../components/UniverseArtwork.vue'
import {
  getCurrentQuestion,
  getGameStats,
  type GameAnswerResponse,
  type SessionAnswer,
} from '../domain/game'
import type { TreasureId } from '../domain/treasure'
import { abandonActiveGame, advanceActiveQuestion, answerActiveQuestion, gameSession, openActiveTreasure } from '../presentation/game-session'
import {
  announceGameAnswer,
  announceGameFinished,
  announceTreasureOpened,
  treasureRewardScene,
} from '../presentation/game-feel'
import { getQuestionHistoryKey } from '../application/question-selection'
import { questionHistoryStore } from '../presentation/question-history-storage'

const route = useRoute()
const router = useRouter()
const error = ref('')
const treasureError = ref('')
const abandonDialog = ref<{ showModal: () => void; close: () => void } | null>(null)
const current = computed(() => gameSession.value ? getCurrentQuestion(gameSession.value) : undefined)
const answered = computed(() => gameSession.value?.phase === 'feedback')
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

onMounted(recordDisplayedQuestion)
watch(displayKey, recordDisplayedQuestion, { flush: 'post' })

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

async function nextQuestion() {
  try {
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
  }
}

async function abandon() {
  try {
    abandonActiveGame()
    abandonDialog.value?.close()
    await router.replace({ name: 'home' })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo abandonar la partida.'
  }
}

function requestAbandon() {
  abandonDialog.value?.showModal()
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
    aria-labelledby="question-title"
  >
    <UniverseArtwork
      class="game-artwash"
      scene="lightning"
      :variation="1"
    />
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
      </div>
      <div class="metric metric-streak">
        <span>Racha actual</span><strong>{{ stats?.currentStreak }}</strong>
      </div>
    </div>
    <div
      class="progress game-progress"
      role="progressbar"
      aria-label="Progreso del reto"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="stats?.progressPercent ?? 0"
      :aria-valuetext="`${stats?.answeredCount ?? 0} de ${stats?.totalQuestions ?? 0} retos completados`"
    >
      <span :style="{ width: `${stats?.progressPercent ?? 0}%` }"></span>
    </div>
    <article
      :key="current.exercise.id"
      class="card question-card game-question-card"
    >
      <p
        v-if="current.exercise.context"
        class="context"
      >
        {{ current.exercise.context }}
      </p>
      <h1 id="question-title">
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
          {{ option.text }}
          <span
            v-if="answered && current.type === 'single_choice' && option.id === current.exercise.correctOptionId"
            class="option-state"
          ><span aria-hidden="true">✓ </span>Respuesta correcta</span>
          <span
            v-else-if="answered && option.id === selectedOptionId"
            class="option-state"
          ><span aria-hidden="true">× </span>Tu respuesta</span>
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
        class="feedback"
        :class="{ success: currentAnswer?.correct }"
        role="status"
      >
        <strong>{{ currentAnswer?.correct ? '¡Muy bien! Sigue explorando.' : 'Casi lo tienes. Aprende con este detalle.' }}</strong>
        <template v-if="current.type === 'typed_answer' && currentAnswer?.type === 'typed_answer'">
          <p><strong>Tu respuesta:</strong> <span class="submitted-answer">{{ currentAnswer.submittedAnswer }}</span></p>
          <p><strong>Respuesta aceptada:</strong> {{ current.exercise.acceptedAnswers.join(' / ') }}</p>
        </template>
        <p>{{ current.exercise.explanation }}</p>
        <button
          class="button primary"
          type="button"
          @click="nextQuestion"
        >
          {{ gameSession.currentQuestionIndex + 1 === gameSession.questions.length ? 'Ver resultados' : 'Siguiente' }}
        </button>
      </div>
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
    </article>
    <TreasureBoard
      v-if="treasureState"
      :state="treasureState"
      :question-count="gameSession.questions.length"
      :can-open="gameSession.phase === 'feedback'"
      compact
      @open="openChest"
    />
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
  <dialog
    ref="abandonDialog"
    class="confirm-dialog"
    aria-labelledby="abandon-title"
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
