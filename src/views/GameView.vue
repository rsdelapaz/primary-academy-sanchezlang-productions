<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { abandonSession, advanceSession, answerCurrent, session } from '../game/session'

const router = useRouter()
const selectedId = ref<string | null>(null)
const answered = ref(false)
const feedbackCorrect = ref(false)

const current = computed(() => session.value?.questions[session.value.currentIndex])

function choose(optionId: string) {
  if (!current.value || answered.value) return
  selectedId.value = optionId
  const answer = answerCurrent(optionId)
  feedbackCorrect.value = answer.correct
  answered.value = true
}

async function nextQuestion() {
  advanceSession()
  if (session.value?.status === 'completed') {
    await router.push('/resultados')
    return
  }
  selectedId.value = null
  answered.value = false
  feedbackCorrect.value = false
}

async function abandon() {
  abandonSession()
  await router.push('/')
}
</script>

<template>
  <section
    v-if="session && current"
    class="screen game-screen"
    aria-labelledby="question-title"
  >
    <div class="game-header">
      <span>Pregunta {{ session.currentIndex + 1 }} de {{ session.questions.length }}</span>
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
      <span :style="{ width: `${((session.currentIndex + (answered ? 1 : 0)) / session.questions.length) * 100}%` }"></span>
    </div>
    <article class="card question-card">
      <p class="context">
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
          v-for="(optionId, index) in current.optionIds"
          :key="optionId"
          type="button"
          class="option"
          :class="{ selected: selectedId === optionId, correct: answered && optionId === current.exercise.correctOptionId, wrong: answered && selectedId === optionId && optionId !== current.exercise.correctOptionId }"
          :disabled="answered"
          @click="choose(optionId)"
        >
          <span
            class="option-key"
            aria-hidden="true"
          >{{ String.fromCharCode(65 + index) }}</span>
          {{ current.exercise.options.find((option) => option.id === optionId)?.label }}
        </button>
      </div>
      <div
        v-if="answered"
        class="feedback"
        :class="{ success: feedbackCorrect }"
        role="status"
      >
        <strong>{{ feedbackCorrect ? '¡Muy bien! Sigue explorando.' : 'Casi lo tienes. Aprende con este detalle.' }}</strong>
        <p>{{ current.exercise.explanation }}</p>
        <button
          class="button primary"
          type="button"
          @click="nextQuestion"
        >
          {{ session.currentIndex + 1 === session.questions.length ? 'Ver resultados' : 'Siguiente' }}
        </button>
      </div>
    </article>
  </section>
  <section
    v-else
    class="screen"
  >
    <p>No hay una partida activa.</p>
    <RouterLink
      class="button primary"
      to="/ingles/irregular-verbs"
    >Ir al tema</RouterLink>
  </section>
</template>
