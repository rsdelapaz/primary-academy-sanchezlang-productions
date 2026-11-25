<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentQuestion, getGameStats } from '../domain/game'
import { abandonActiveGame, advanceActiveQuestion, answerActiveQuestion, gameSession } from '../presentation/game-session'

const route = useRoute()
const router = useRouter()
const error = ref('')
const abandonDialog = ref<HTMLDialogElement | null>(null)
const current = computed(() => gameSession.value ? getCurrentQuestion(gameSession.value) : undefined)
const answered = computed(() => gameSession.value?.phase === 'feedback')
const stats = computed(() => gameSession.value ? getGameStats(gameSession.value) : null)
const selectedOptionId = computed(() => {
  const game = gameSession.value
  const question = current.value
  if (!game || !question || !answered.value) return null
  return game.answers.find((answer) => answer.exerciseId === question.exercise.id)?.selectedOptionId ?? null
})
const options = computed(() => current.value?.optionIds.map((id) => ({
  id,
  text: current.value?.exercise.options.find((option) => option.id === id)?.text ?? '',
})) ?? [])

function choose(optionId: string) {
  if (!current.value) return
  try {
    error.value = ''
    answerActiveQuestion(current.value.exercise.id, optionId)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo evaluar la respuesta.'
  }
}

async function nextQuestion() {
  try {
    const updated = advanceActiveQuestion()
    if (updated.status === 'completed') {
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
</script>

<template>
  <section
    v-if="gameSession && current"
    class="screen game-screen"
    aria-labelledby="question-title"
  >
    <div class="game-header">
      <span>Pregunta {{ gameSession.currentQuestionIndex + 1 }} de {{ gameSession.questions.length }}</span>
      <button
        class="text-button"
        type="button"
        @click="requestAbandon"
      >
        Abandonar
      </button>
    </div>
    <div class="game-metrics" aria-label="Tu partida">
      <div class="metric"><span>⭐ Puntos</span><strong>{{ stats?.score }}</strong></div>
      <div class="metric"><span>🔥 Racha actual</span><strong>{{ stats?.currentStreak }}</strong></div>
    </div>
    <div
      class="progress"
      aria-hidden="true"
    >
      <span :style="{ width: `${stats?.progressPercent ?? 0}%` }"></span>
    </div>
    <p class="progress-label">{{ stats?.answeredCount }} de {{ stats?.totalQuestions }} retos completados</p>
    <article class="card question-card">
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
            correct: answered && option.id === current.exercise.correctOptionId,
            wrong: answered && selectedOptionId === option.id && option.id !== current.exercise.correctOptionId,
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
            v-if="answered && option.id === current.exercise.correctOptionId"
            class="option-state"
          ><span aria-hidden="true">✓ </span>Respuesta correcta</span>
          <span
            v-else-if="answered && option.id === selectedOptionId"
            class="option-state"
          ><span aria-hidden="true">× </span>Tu respuesta</span>
        </button>
      </div>
      <div
        v-if="answered"
        class="feedback"
        :class="{ success: selectedOptionId === current.exercise.correctOptionId }"
        role="status"
      >
        <strong>{{ selectedOptionId === current.exercise.correctOptionId ? '¡Muy bien! Sigue explorando.' : 'Casi lo tienes. Aprende con este detalle.' }}</strong>
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
  <dialog ref="abandonDialog" class="confirm-dialog" aria-labelledby="abandon-title">
    <h2 id="abandon-title">¿Quieres salir del reto?</h2>
    <p>La partida actual se cerrará. Puedes volver a empezar cuando quieras.</p>
    <div class="confirm-actions">
      <button class="button secondary" type="button" autofocus @click="abandonDialog?.close()">
        Seguir jugando
      </button>
      <button class="button primary" type="button" @click="abandon">
        Salir al inicio
      </button>
    </div>
  </dialog>
</template>
