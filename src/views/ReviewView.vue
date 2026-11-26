<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { SessionAnswer, SessionQuestion } from '../domain/game'
import { gameSession } from '../presentation/game-session'

const route = useRoute()
type ReviewItem =
  | {
      type: 'single_choice'
      answer: Extract<SessionAnswer, { type: 'single_choice' }>
      question: Extract<SessionQuestion, { type: 'single_choice' }>
    }
  | {
      type: 'typed_answer'
      answer: Extract<SessionAnswer, { type: 'typed_answer' }>
      question: Extract<SessionQuestion, { type: 'typed_answer' }>
    }
const errors = computed(() => {
  const game = gameSession.value
  if (!game) return [] as ReviewItem[]
  return game.answers.flatMap((answer): ReviewItem[] => {
    if (answer.correct) return []
    const question = game.questions.find((item) => item.exercise.id === answer.exerciseId)
    if (!question) {
      throw new Error('No se pudo encontrar la pregunta correspondiente a la respuesta.')
    }
    if (answer.type === 'typed_answer') {
      if (question.type !== 'typed_answer') {
        throw new Error('El tipo de respuesta no coincide con la pregunta revisada.')
      }
      return [{ type: 'typed_answer', answer, question }]
    }
    if (question.type !== 'single_choice') {
      throw new Error('El tipo de respuesta no coincide con la pregunta revisada.')
    }
    return [{ type: 'single_choice', answer, question }]
  })
})
</script>

<template>
  <section
    class="screen review-screen"
    aria-labelledby="review-title"
  >
    <RouterLink
      class="back-link"
      :to="{ name: 'results', params: route.params }"
    >← Resultados</RouterLink>
    <p class="eyebrow">
      Aprendizaje
    </p>
    <h1 id="review-title">
      Revisión de errores
    </h1>
    <div
      v-if="errors.length"
      class="review-list"
    >
      <article
        v-for="item in errors"
        :key="item.answer.exerciseId"
        class="card review-card"
      >
        <h2>{{ item.question.exercise.prompt }}</h2>
        <template v-if="item.type === 'typed_answer'">
          <p><strong>Escribiste:</strong> <span class="submitted-answer">{{ item.answer.submittedAnswer }}</span></p>
          <p><strong>Respuesta aceptada:</strong> {{ item.question.exercise.acceptedAnswers.join(' / ') }}</p>
        </template>
        <template v-else>
          <p><strong>Elegiste:</strong> {{ item.question.exercise.options.find((option) => option.id === item.answer.selectedOptionId)?.text }}</p>
          <p><strong>Respuesta:</strong> {{ item.question.exercise.options.find((option) => option.id === item.question.exercise.correctOptionId)?.text }}</p>
        </template>
        <p>{{ item.question.exercise.explanation }}</p>
      </article>
    </div>
    <div
      v-else
      class="card"
    >
      <h2>¡No tienes errores que revisar!</h2>
      <p>Has completado la expedición sin fallos.</p>
    </div>
  </section>
</template>
