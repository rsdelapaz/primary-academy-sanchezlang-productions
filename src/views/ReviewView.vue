<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { contentService } from '../content/service'
import type { ContentPackage } from '../domain/content'
import { evaluateGameAnswer, type AnswerEvaluation, type GameAnswerResponse } from '../domain/exercise-engine'
import { createTrainingItems, trainingAnswerText, trainingCorrectText, type TrainingItem } from '../domain/training-session'
import { gameSession } from '../presentation/game-session'
import { promptSegments } from '../presentation/prompt-presentation'
import { useThemePreference } from '../presentation/theme-preference'
import '../training-experience.css'

const route = useRoute()
const { activeTheme, focusMode } = useThemePreference()
const academyName = computed(() => focusMode.value ? 'Academia RetoNautas'
  : activeTheme.value === 'galaxy' ? 'Academia Estelar' : 'Academia de los Cristales')
const BLOCK_SIZE = 5
const session = gameSession.value
// Game transitions replace the snapshot; this view never reads or updates the live session again.
const completedGame = session?.status === 'completed' && session.result ? session : null
const errorCount = completedGame?.answers.filter((answer) => !answer.correct).length ?? 0
const resultsDestination = {
  name: 'results',
  params: completedGame
    ? { subjectId: completedGame.subjectId, topicId: completedGame.topicId, modeId: completedGame.modeId }
    : route.params,
}

type TrainingPhase = 'loading' | 'empty' | 'unavailable' | 'review' | 'practice' | 'feedback' | 'summary'
const phase = ref<TrainingPhase>(!completedGame ? 'unavailable' : errorCount ? 'loading' : 'empty')
const items = shallowRef<TrainingItem[]>([])
const evaluations = shallowRef<AnswerEvaluation[]>([])
const blockStart = ref(0)
const itemIndex = ref(0)
const selectedOptionId = ref('')
const writtenAnswer = ref('')
const evaluationError = ref('')
const contentHeading = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
let unmounted = false

const current = computed(() => items.value[itemIndex.value])
const original = computed(() => current.value?.original)
const practice = computed(() => current.value?.practice)
const reviewSegments = computed(() => promptSegments(original.value?.exercise.prompt ?? ''))
const practiceSegments = computed(() => promptSegments(practice.value?.exercise.prompt ?? ''))
const practiceOptions = computed(() => {
  const question = practice.value
  if (question?.type !== 'single_choice') return []
  return question.optionIds.map((id) => ({
    id,
    text: question.exercise.options.find((option) => option.id === id)?.text ?? '',
  }))
})
const currentEvaluation = computed(() => evaluations.value[itemIndex.value])
const blockEnd = computed(() => Math.min(blockStart.value + BLOCK_SIZE, items.value.length))
const blockNumber = computed(() => Math.floor(blockStart.value / BLOCK_SIZE) + 1)
const totalBlocks = computed(() => Math.ceil(items.value.length / BLOCK_SIZE))
const blockLength = computed(() => blockEnd.value - blockStart.value)
const blockEvaluations = computed(() => evaluations.value.slice(blockStart.value, blockEnd.value))
const blockCorrect = computed(() => blockEvaluations.value.filter((answer) => answer.correct).length)
const blockIncorrect = computed(() => blockEvaluations.value.length - blockCorrect.value)
const remainingItems = computed(() => items.value.length - blockEnd.value)
const totalCorrect = computed(() => evaluations.value.filter((answer) => answer.correct).length)
const canCheck = computed(() => phase.value === 'practice' && evaluations.value.length === itemIndex.value &&
  (practice.value?.type === 'single_choice'
    ? practiceOptions.value.some(({ id }) => id === selectedOptionId.value)
    : practice.value?.type === 'typed_answer' && Boolean(writtenAnswer.value.trim())))
const announcement = computed(() => {
  if (phase.value === 'feedback' && currentEvaluation.value) {
    return currentEvaluation.value.correct ? 'Respuesta correcta.' : 'Aún por practicar. Lee la explicación.'
  }
  if (phase.value === 'summary') return remainingItems.value > 0 ? 'Bloque completado.' : 'Entrenamiento completado.'
  return ''
})

function focusContent() {
  void nextTick(() => {
    if (unmounted) return
    if (globalThis.innerHeight <= 430) {
      contentHeading.value?.closest('article')?.scrollIntoView({ block: 'start', behavior: 'auto' })
    } else {
      globalThis.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
    contentHeading.value?.focus({ preventScroll: true })
  })
}

async function prepareTraining() {
  if (!completedGame || !errorCount) return
  // Review can start immediately, even offline. Prefer fresh variants if the
  // validated package arrives before the player begins the first practice.
  try {
    items.value = createTrainingItems(completedGame)
  } catch {
    phase.value = 'unavailable'
    focusContent()
    return
  }
  phase.value = items.value.length ? 'review' : 'unavailable'
  focusContent()
  if (!items.value.length) return

  try {
    const manifest = await contentService.loadManifest()
    if (unmounted || phase.value !== 'review' || itemIndex.value !== 0) return
    const subject = manifest.subjects.find(({ id }) => id === completedGame.subjectId)
    const topic = subject?.topics.find(({ id }) => id === completedGame.topicId)
    if (!subject || !topic) return
    const content: ContentPackage = await contentService.loadPackage(subject, topic)
    if (unmounted || phase.value !== 'review' || itemIndex.value !== 0) return
    items.value = createTrainingItems(completedGame, content)
  } catch {
    // The original validated questions remain playable without the network.
  }
}
function beginPractice() {
  if (phase.value !== 'review' || !current.value) return
  selectedOptionId.value = ''
  writtenAnswer.value = ''
  evaluationError.value = ''
  phase.value = 'practice'
  focusContent()
}

function checkAnswer() {
  const question = practice.value
  if (!canCheck.value || !question) return
  const response: GameAnswerResponse = question.type === 'single_choice'
    ? { type: 'single_choice', optionId: selectedOptionId.value }
    : { type: 'typed_answer', text: writtenAnswer.value }
  try {
    const evaluation = evaluateGameAnswer(question.exercise, response)
    evaluations.value = [...evaluations.value, evaluation]
    evaluationError.value = ''
    phase.value = 'feedback'
    focusContent()
  } catch {
    evaluationError.value = 'No se ha podido comprobar tu respuesta. Inténtalo de nuevo.'
  }
}

function continueTraining() {
  if (phase.value !== 'feedback' || !currentEvaluation.value) return
  if (itemIndex.value + 1 >= blockEnd.value) {
    phase.value = 'summary'
  } else {
    itemIndex.value += 1
    phase.value = 'review'
  }
  focusContent()
}

function startNextBlock() {
  if (phase.value !== 'summary' || remainingItems.value <= 0) return
  const nextStart = blockEnd.value
  blockStart.value = nextStart
  itemIndex.value = nextStart
  phase.value = 'review'
  focusContent()
}

onMounted(() => {
  if (phase.value === 'loading') void prepareTraining()
  else focusContent()
})
onBeforeUnmount(() => { unmounted = true })
</script>

<template>
  <section
    class="screen academy-screen"
    aria-labelledby="academy-title"
  >
    <header class="academy-header">
      <p class="eyebrow">
        {{ academyName }}
      </p>
      <h1 id="academy-title">
        Sala de entrenamiento
      </h1>
      <p class="academy-intro">
        <span class="academy-intro-description">Aprende de tus errores y vuelve a practicar. </span><span class="academy-intro-note">Sin perder puntos, a tu ritmo.</span>
      </p>
    </header>
    <div
      v-if="items.length"
      class="academy-progress"
    >
      <div class="academy-progress-caption">
        <span>Bloque {{ blockNumber }}/{{ totalBlocks }} <span aria-hidden="true">·</span></span>
        <strong>{{ evaluations.length }} de {{ items.length }} entrenados</strong>
      </div>
      <progress
        class="academy-progress-track"
        :max="items.length"
        :value="evaluations.length"
        aria-label="Progreso del entrenamiento"
      />
      <p class="academy-counter">
        {{ phase === 'summary' ? 'Bloque completado' : `Reto ${itemIndex - blockStart + 1} de ${blockLength}` }}
      </p>
    </div>
    <article
      v-if="phase === 'loading'"
      class="card academy-card academy-loading"
      aria-busy="true"
    >
      <h2>Preparando tus ejercicios…</h2>
      <p role="status">
        Vamos a entrenar lo que más te ha costado.
      </p>
    </article>
    <article
      v-else-if="phase === 'empty'"
      class="card academy-card academy-empty"
    >
      <p class="academy-phase">
        ¡Misión perfecta!
      </p>
      <h2
        ref="contentHeading"
        tabindex="-1"
      >
        No tienes errores que repasar
      </h2>
      <p>Has completado el reto sin fallos.</p>
    </article>
    <article
      v-else-if="phase === 'unavailable'"
      class="card academy-card academy-unavailable"
    >
      <h2
        ref="contentHeading"
        tabindex="-1"
      >
        No hay un entrenamiento disponible
      </h2>
      <p>Puedes volver a los resultados sin perder tu puntuación.</p>
    </article>
    <article
      v-else-if="phase === 'review' && current && original"
      class="card academy-card academy-review"
    >
      <p class="academy-phase">
        1 · Descubre el error
      </p>
      <p
        v-if="original.exercise.context"
        class="academy-context"
      >
        {{ original.exercise.context }}
      </p>
      <h2
        ref="contentHeading"
        class="academy-question"
        tabindex="-1"
        :lang="original.exercise.exerciseLanguage"
      >
        <span
          v-for="(segment, index) in reviewSegments"
          :key="index"
          :class="{ 'prompt-emphasis': segment.emphasized }"
        >{{ segment.text }}</span>
      </h2>
      <div class="academy-answer-pair">
        <div class="academy-answer academy-answer--own">
          <strong class="academy-answer-label">Tu respuesta</strong>
          <span
            class="academy-answer-value"
            :lang="original.exercise.exerciseLanguage"
          >{{ trainingAnswerText(original, current.answer) }}</span>
        </div>
        <div class="academy-answer academy-answer--correct">
          <strong class="academy-answer-label">✓ Respuesta correcta</strong>
          <span
            class="academy-answer-value"
            :lang="original.exercise.exerciseLanguage"
          >{{ trainingCorrectText(original) }}</span>
        </div>
      </div>
      <p
        class="academy-explanation"
        :lang="original.exercise.explanationLanguage"
      >
        {{ original.exercise.explanation }}
      </p>
    </article>
    <article
      v-else-if="phase === 'practice' && current && practice"
      class="card academy-card academy-practice"
    >
      <p class="academy-phase">
        2 · {{ current.isVariant ? 'Prueba un ejercicio parecido' : 'Vuelve a intentarlo' }}
      </p>
      <p
        v-if="practice.exercise.context"
        class="academy-context"
      >
        {{ practice.exercise.context }}
      </p>
      <h2
        ref="contentHeading"
        class="academy-question"
        tabindex="-1"
        :lang="practice.exercise.exerciseLanguage"
      >
        <span
          v-for="(segment, index) in practiceSegments"
          :key="index"
          :class="{ 'prompt-emphasis': segment.emphasized }"
        >{{ segment.text }}</span>
      </h2>
      <form
        id="academy-answer-form"
        class="academy-form"
        @submit.prevent="checkAnswer"
      >
        <fieldset
          v-if="practice.type === 'single_choice'"
          class="academy-options"
        >
          <legend class="sr-only">
            Elige una respuesta
          </legend>
          <label
            v-for="(option, index) in practiceOptions"
            :key="option.id"
            class="academy-option"
            :class="{ selected: selectedOptionId === option.id }"
          >
            <input
              v-model="selectedOptionId"
              type="radio"
              name="academy-option"
              :value="option.id"
            />
            <span
              aria-hidden="true"
              class="academy-option-letter"
            >{{ String.fromCharCode(65 + index) }}</span>
            <span :lang="practice.exercise.exerciseLanguage">{{ option.text }}</span>
          </label>
        </fieldset>
        <div
          v-else
          class="academy-typed"
        >
          <label for="academy-written-answer">Tu respuesta</label>
          <input
            id="academy-written-answer"
            v-model="writtenAnswer"
            class="typed-answer-input"
            type="text"
            :lang="practice.exercise.exerciseLanguage"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="done"
            required
          />
        </div>
        <p
          v-if="evaluationError"
          class="error"
          role="alert"
        >
          {{ evaluationError }}
        </p>
      </form>
    </article>
    <article
      v-else-if="phase === 'feedback' && practice && currentEvaluation"
      class="card academy-card academy-feedback"
      :class="currentEvaluation.correct ? 'academy-feedback--correct' : 'academy-feedback--incorrect'"
    >
      <p class="academy-phase">
        Resultado de la práctica
      </p>
      <h2
        ref="contentHeading"
        tabindex="-1"
      >
        {{ currentEvaluation.correct ? '¡Lo has conseguido!' : 'Aún puedes mejorarlo' }}
      </h2>
      <p
        v-if="practice.exercise.context"
        class="academy-context"
      >
        {{ practice.exercise.context }}
      </p>
      <p
        class="academy-question"
        :lang="practice.exercise.exerciseLanguage"
      >
        {{ practice.exercise.prompt }}
      </p>
      <div class="academy-answer-pair">
        <div
          v-if="!currentEvaluation.correct"
          class="academy-answer academy-answer--own"
        >
          <strong class="academy-answer-label">Tu respuesta</strong>
          <span
            class="academy-answer-value"
            :lang="practice.exercise.exerciseLanguage"
          >{{ trainingAnswerText(practice, currentEvaluation) }}</span>
        </div>
        <div class="academy-answer academy-answer--correct">
          <strong class="academy-answer-label">✓ Respuesta correcta</strong>
          <span
            class="academy-answer-value"
            :lang="practice.exercise.exerciseLanguage"
          >{{ trainingCorrectText(practice) }}</span>
        </div>
      </div>
      <p
        class="academy-explanation"
        :lang="practice.exercise.explanationLanguage"
      >
        {{ practice.exercise.explanation }}
      </p>
    </article>
    <article
      v-else-if="phase === 'summary'"
      class="card academy-card academy-summary"
    >
      <p class="academy-phase">
        Bloque {{ blockNumber }} · Completado
      </p>
      <h2
        ref="contentHeading"
        tabindex="-1"
      >
        {{ remainingItems ? '¡Buen entrenamiento!' : '¡Entrenamiento terminado!' }}
      </h2>
      <dl class="academy-summary-stats">
        <div class="academy-stat">
          <dt>Practicados</dt>
          <dd>{{ blockEvaluations.length }}</dd>
        </div>
        <div class="academy-stat">
          <dt>Acertados</dt>
          <dd>{{ blockCorrect }}</dd>
        </div>
        <div class="academy-stat">
          <dt>Por mejorar</dt>
          <dd>{{ blockIncorrect }}</dd>
        </div>
      </dl>
      <p v-if="remainingItems">
        Quedan {{ remainingItems }} {{ remainingItems === 1 ? 'reto por entrenar' : 'retos por entrenar' }}. Puedes continuar o volver a tus resultados.
      </p>
      <p v-else>
        Has practicado todos los errores de tu partida y acertado {{ totalCorrect }} de {{ evaluations.length }} ejercicios de entrenamiento.
      </p>
    </article>
    <p
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ announcement }}
    </p>
    <footer
      class="academy-actions"
      :class="{ 'academy-actions-summary': phase === 'summary' }"
    >
      <button
        v-if="phase === 'review'"
        class="button primary academy-cta"
        type="button"
        @click="beginPractice"
      >
        Practicar <span aria-hidden="true">→</span>
      </button>
      <button
        v-else-if="phase === 'practice'"
        class="button primary academy-cta"
        type="submit"
        form="academy-answer-form"
        :disabled="!canCheck"
      >
        Comprobar respuesta
      </button>
      <button
        v-else-if="phase === 'feedback'"
        type="button"
        class="button primary academy-cta"
        @click="continueTraining"
      >
        {{ itemIndex + 1 >= blockEnd ? 'Ver resumen' : 'Continuar' }} <span aria-hidden="true">→</span>
      </button>
      <button
        v-else-if="phase === 'summary' && remainingItems"
        type="button"
        class="button primary academy-cta"
        @click="startNextBlock"
      >
        Siguiente bloque <span aria-hidden="true">→</span>
      </button>
      <RouterLink
        class="button academy-exit"
        :class="['review', 'practice', 'feedback'].includes(phase) || (phase === 'summary' && remainingItems) ? 'secondary' : 'primary academy-cta'"
        :to="resultsDestination"
      >
        Volver a resultados
      </RouterLink>
    </footer>
  </section>
</template>
