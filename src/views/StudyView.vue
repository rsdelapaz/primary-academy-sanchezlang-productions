<script setup lang="ts">
import '../study-experience.css'
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import SubjectGlyph from '../components/SubjectGlyph.vue'
import { isFlashcardExercise, type ContentManifest } from '../domain/content'
import { getCurrentStudyCard, getStudyStats } from '../domain/study-session'
import { contentService } from '../content/service'
import {
  finishActiveStudy,
  rateActiveStudyCard,
  restartActiveStudy,
  reviewPendingActiveStudy,
  revealActiveStudyCard,
  studySession,
} from '../presentation/study-session'

const loading = ref(false)
const error = ref('')
const catalog = shallowRef<ContentManifest | null>(null)
const cardHeading = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
const answerHeading = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
const summaryHeading = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
const session = computed(() => studySession.value)
const currentCard = computed(() => session.value ? getCurrentStudyCard(session.value) : undefined)
const stats = computed(() => session.value ? getStudyStats(session.value) : null)
const subject = computed(() => catalog.value?.subjects.find(({ id }) => id === session.value?.subjectId))
const topic = computed(() => subject.value?.topics.find(({ id }) => id === session.value?.topicId))
const pendingReviewCount = computed(() => (stats.value?.pendingCount ?? 0) + (stats.value?.unreviewedCount ?? 0))
const explanation = computed(() => {
  const card = currentCard.value?.exercise
  if (!card || card.explanation.trim() === card.back.trim()) return ''
  return card.explanation.trim()
})

onMounted(async () => {
  try {
    catalog.value = await contentService.loadManifest()
  } catch {
    // The selected cards are already loaded; keep studying if catalog metadata is unavailable.
  }
})

async function focusStudyContent() {
  await nextTick()
  const target = session.value?.status === 'completed' ? summaryHeading.value : cardHeading.value
  target?.focus({ preventScroll: true })
  if (target && (target.getBoundingClientRect().top < 90 || target.getBoundingClientRect().bottom > globalThis.innerHeight - 110)) {
    target.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
}

async function reveal() {
  error.value = ''
  try {
    revealActiveStudyCard()
    await nextTick()
    answerHeading.value?.focus({ preventScroll: true })
    if (answerHeading.value && answerHeading.value.getBoundingClientRect().bottom > globalThis.innerHeight - 125) {
      answerHeading.value.scrollIntoView({ block: 'center', behavior: 'instant' })
    }
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo revelar la tarjeta.'
  }
}

function rate(remembered: boolean) {
  error.value = ''
  try {
    rateActiveStudyCard(remembered)
    void focusStudyContent()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo guardar la autoevaluación.'
  }
}

function finish() {
  error.value = ''
  try {
    finishActiveStudy()
    void focusStudyContent()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo terminar el estudio.'
  }
}

function reviewPending() {
  error.value = ''
  try {
    reviewPendingActiveStudy()
    void focusStudyContent()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo preparar el repaso.'
  }
}

async function restart() {
  const previous = session.value
  if (!previous || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const manifest = await contentService.loadManifest()
    const currentSubject = manifest.subjects.find(({ id }) => id === previous.subjectId)
    const currentTopic = currentSubject?.topics.find(({ id }) => id === previous.topicId)
    if (!currentSubject || !currentTopic) throw new Error('El contenido original ya no está en el catálogo.')
    const content = await contentService.loadPackage(currentSubject, currentTopic)
    restartActiveStudy(content.exercises.filter(isFlashcardExercise))
    void focusStudyContent()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo reiniciar el estudio.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    v-if="session && stats"
    class="screen study-screen"
    :class="{ 'study-active': session.status === 'active' }"
    aria-labelledby="study-title"
  >
    <header class="study-heading">
      <div class="study-heading-row">
        <div class="study-topic-label">
          <SubjectGlyph :subject-id="session.subjectId" />
          <span>{{ subject?.title ?? 'Autoestudio' }}<span v-if="topic"> · {{ topic.title }}</span></span>
        </div>
        <button
          v-if="session.status === 'active'"
          class="study-finish"
          type="button"
          @click="finish"
        >
          Terminar
        </button>
      </div>
      <h1 id="study-title">
        {{ session.status === 'completed' ? 'Resumen de estudio' : 'Tarjetas de memoria' }}
      </h1>
    </header>

    <div class="study-progress">
      <div class="study-progress-heading">
        <strong>{{ stats.completedCount }} de {{ stats.totalCards }} tarjetas revisadas</strong>
        <span>{{ stats.progressPercent }}%</span>
      </div>
      <div
        class="progress"
        role="progressbar"
        aria-label="Tarjetas revisadas"
        :aria-valuenow="stats.progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ width: `${stats.progressPercent}%` }"></span>
      </div>
    </div>

    <div
      class="study-metrics"
      aria-label="Resumen del estudio"
      aria-live="polite"
    >
      <div class="study-stat study-stat--remembered">
        <strong>{{ stats.rememberedCount }}</strong><span>Recordadas</span>
      </div>
      <div class="study-stat study-stat--review">
        <strong>{{ stats.pendingCount }}</strong><span>Para repasar</span>
      </div>
      <div class="study-stat">
        <strong>{{ stats.unreviewedCount }}</strong><span>Sin revisar</span>
      </div>
    </div>

    <template v-if="session.status === 'active' && currentCard">
      <article
        class="study-paper"
        :class="{ 'study-paper--revealed': session.phase === 'back' }"
      >
        <div class="study-paper-top">
          <span>{{ currentCard.presentations > 1 ? '↻ Volvemos a esta tarjeta' : 'PREGUNTA' }}</span>
          <span v-if="session.phase === 'front'">Recuerda</span>
          <span v-else>Comprueba</span>
        </div>
        <h2
          ref="cardHeading"
          class="study-question"
          tabindex="-1"
        >
          {{ currentCard.exercise.front }}
        </h2>
        <p
          v-if="session.phase === 'front'"
          class="study-paper-hint"
        >
          Piensa la respuesta antes de descubrirla.
        </p>
        <div
          v-else
          class="study-answer"
        >
          <p class="study-answer-label">
            Respuesta
          </p>
          <h3
            ref="answerHeading"
            tabindex="-1"
          >
            {{ currentCard.exercise.back }}
          </h3>
          <div
            v-if="explanation"
            class="study-explanation"
          >
            <strong>Recuerda</strong>
            <p>{{ explanation }}</p>
          </div>
        </div>
      </article>

      <div class="study-action-bar">
        <div class="study-action-inner">
          <button
            v-if="session.phase === 'front'"
            class="button primary study-reveal"
            type="button"
            @click="reveal"
          >
            Mostrar respuesta
          </button>
          <template v-else>
            <p class="study-rating-label">
              ¿La recordabas antes de verla?
            </p>
            <div
              class="study-rating-actions"
              role="group"
              aria-label="¿La recordabas?"
            >
              <button
                class="button study-review"
                type="button"
                @click="rate(false)"
              >
                <span aria-hidden="true">↻</span> Necesito repasar
              </button>
              <button
                class="button study-remembered"
                type="button"
                @click="rate(true)"
              >
                <span aria-hidden="true">✓</span> Lo sabía
              </button>
            </div>
          </template>
        </div>
      </div>
    </template>

    <section
      v-else
      class="study-paper study-summary"
      aria-labelledby="study-results-title"
    >
      <span
        class="study-summary-icon"
        aria-hidden="true"
      >{{ pendingReviewCount ? '↻' : '✓' }}</span>
      <h2
        id="study-results-title"
        ref="summaryHeading"
        tabindex="-1"
      >
        {{ session.endedEarly ? 'Tu repaso, a tu ritmo' : pendingReviewCount ? 'Un paso más' : '¡Las recordaste todas!' }}
      </h2>
      <p v-if="pendingReviewCount">
        {{ session.endedEarly ? 'Puedes retomar las tarjetas que faltan.' : 'Vuelve a las tarjetas que más te han costado.' }}
      </p>
      <p v-else>
        Has recordado todas las tarjetas de esta sesión. ¡Buen trabajo!
      </p>
      <button
        v-if="pendingReviewCount"
        class="button study-summary-primary"
        type="button"
        :disabled="loading"
        @click="reviewPending"
      >
        Repasar pendientes ({{ pendingReviewCount }}) →
      </button>
      <button
        class="button"
        :class="pendingReviewCount ? 'study-summary-secondary' : 'study-summary-primary'"
        type="button"
        :disabled="loading"
        @click="restart"
      >
        {{ loading ? 'Preparando...' : 'Nueva sesión' }}
      </button>
      <RouterLink
        class="button study-summary-secondary"
        :to="{ name: 'choose-challenge', query: { experience: 'study' } }"
      >
        Elegir otro tema
      </RouterLink>
      <RouterLink
        class="study-summary-home"
        :to="{ name: 'home' }"
      >
        Volver al inicio
      </RouterLink>
    </section>

    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
  <section
    v-else
    class="screen"
  >
    <p>No hay una sesión de estudio activa.</p>
    <RouterLink
      class="button primary"
      :to="{ name: 'choose-challenge', query: { experience: 'study' } }"
    >
      Elegir contenido
    </RouterLink>
  </section>
</template>
