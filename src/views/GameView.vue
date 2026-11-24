<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getCurrentQuestion } from '../domain/game'
import { abandonActiveGame, advanceActiveQuestion, answerActiveQuestion, gameSession } from '../presentation/game-session'

const route = useRoute()
const router = useRouter()
const error = ref('')
const current = computed(() => gameSession.value ? getCurrentQuestion(gameSession.value) : undefined)
const answered = computed(() => gameSession.value?.phase === 'feedback')
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
    await router.replace({ name: 'home' })
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo abandonar la partida.'
  }
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
        @click="abandon"
      >
        Abandonar
      </button>
    </div>
    <div
      class="progress"
      aria-hidden="true"
    >
      <span :style="{ width: `${((gameSession.currentQuestionIndex + (answered ? 1 : 0)) / gameSession.questions.length) * 100}%` }"></span>
    </div>
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
</template>
