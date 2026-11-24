<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { session } from '../game/session'

const errors = computed(() => {
  if (!session.value) return []
  return session.value.answers
    .filter((answer) => !answer.correct)
    .map((answer) => ({
      answer,
      question: session.value!.questions.find((item) => item.exercise.id === answer.exerciseId)?.exercise,
    }))
})
</script>

<template>
  <section
    class="screen"
    aria-labelledby="review-title"
  >
    <RouterLink
      class="back-link"
      to="/resultados"
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
        <h2>{{ item.question?.prompt }}</h2>
        <p><strong>Elegiste:</strong> {{ item.question?.options.find((option) => option.id === item.answer.selectedOptionId)?.label }}</p>
        <p><strong>Respuesta:</strong> {{ item.question?.options.find((option) => option.id === item.question?.correctOptionId)?.label }}</p>
        <p>{{ item.question?.explanation }}</p>
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
