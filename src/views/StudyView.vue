<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { isFlashcardExercise } from '../domain/content'
import {
  getCurrentStudyCard,
  getStudyStats,
  MAX_STUDY_CARD_PRESENTATIONS,
} from '../domain/study-session'
import { contentService } from '../content/service'
import {
  finishActiveStudy,
  rateActiveStudyCard,
  restartActiveStudy,
  revealActiveStudyCard,
  studySession,
} from '../presentation/study-session'

const loading = ref(false)
const error = ref('')
const session = computed(() => studySession.value)
const currentCard = computed(() => session.value ? getCurrentStudyCard(session.value) : undefined)
const stats = computed(() => session.value ? getStudyStats(session.value) : null)

function reveal() {
  error.value = ''
  try {
    revealActiveStudyCard()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo revelar la tarjeta.'
  }
}

function rate(remembered: boolean) {
  error.value = ''
  try {
    rateActiveStudyCard(remembered)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo guardar la autoevaluación.'
  }
}

function finish() {
  error.value = ''
  try {
    finishActiveStudy()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo terminar el estudio.'
  }
}

async function restart() {
  const previous = session.value
  if (!previous || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const catalog = await contentService.loadManifest()
    const subject = catalog.subjects.find(({ id }) => id === previous.subjectId)
    const topic = subject?.topics.find(({ id }) => id === previous.topicId)
    if (!subject || !topic) throw new Error('El contenido original ya no está en el catálogo.')
    const content = await contentService.loadPackage(subject, topic)
    restartActiveStudy(content.exercises.filter(isFlashcardExercise))
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo reiniciar el estudio.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section v-if="session && stats" class="screen study-screen" aria-labelledby="study-title">
    <header class="study-heading">
      <p class="eyebrow">Área de autoestudio</p>
      <h1 id="study-title">{{ session.phase === 'completed' ? '¡Buen repaso!' : 'Tarjetas de memoria' }}</h1>
      <p>Aprende a tu ritmo: revela cada respuesta y decide si la recordabas.</p>
    </header>

    <div class="study-progress">
      <div class="study-progress-heading">
        <strong v-if="session.status === 'active'">Tarjeta {{ stats.completedCount + 1 }} de {{ stats.totalCards }}</strong>
        <strong v-else>Sesión completada</strong>
        <span>{{ stats.progressPercent }}%</span>
      </div>
      <div class="progress" role="progressbar" :aria-valuenow="stats.progressPercent" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: `${stats.progressPercent}%` }"></span>
      </div>
    </div>

    <div class="study-metrics" aria-label="Resumen del estudio">
      <div class="metric"><span>Recordadas</span><strong>{{ stats.rememberedCount }}</strong></div>
      <div class="metric"><span>Pendientes</span><strong>{{ stats.pendingCount }}</strong></div>
      <div class="metric"><span>Repeticiones</span><strong>{{ stats.repetitionCount }}</strong></div>
    </div>

    <article v-if="session.status === 'active' && currentCard" class="study-card card" aria-live="polite">
      <p class="study-card-index">Presentación {{ currentCard.presentations }} de {{ MAX_STUDY_CARD_PRESENTATIONS }}</p>
      <div class="study-card-content">
        <p class="eyebrow">{{ session.phase === 'front' ? 'Anverso' : 'Reverso' }}</p>
        <h2>{{ session.phase === 'front' ? currentCard.exercise.front : currentCard.exercise.back }}</h2>
      </div>
      <button v-if="session.phase === 'front'" class="button primary study-reveal" type="button" @click="reveal">
        Revelar respuesta
      </button>
      <div v-else class="study-rating-actions" role="group" aria-label="¿Cómo te fue?">
        <button class="button secondary" type="button" @click="rate(true)">✓ Lo recordaba</button>
        <button class="button primary" type="button" @click="rate(false)">↻ Necesito repasar</button>
      </div>
    </article>

    <section v-else class="card study-results" aria-labelledby="study-results-title">
      <h2 id="study-results-title">{{ session.endedEarly ? 'Estudio terminado antes de tiempo' : 'Resumen de tu sesión' }}</h2>
      <p v-if="session.endedEarly">Las tarjetas restantes quedan pendientes para otro repaso, sin penalización.</p>
      <p v-else>¡Has completado el repaso de esta sesión!</p>
      <dl>
        <div><dt>Tarjetas recordadas</dt><dd>{{ stats.rememberedCount }}</dd></div>
        <div><dt>Pendientes de repaso</dt><dd>{{ stats.pendingCount }}</dd></div>
        <div><dt>Repeticiones realizadas</dt><dd>{{ stats.repetitionCount }}</dd></div>
      </dl>
      <button class="button primary study-restart" type="button" :disabled="loading" @click="restart">
        {{ loading ? 'Preparando...' : 'Volver a estudiar' }}
      </button>
      <RouterLink class="button secondary" :to="{ name: 'choose-challenge', query: { experience: 'study' } }">
        Elegir otro contenido
      </RouterLink>
      <RouterLink class="text-link" :to="{ name: 'home' }">Ir al inicio</RouterLink>
    </section>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <button
      v-if="session.status === 'active'"
      class="text-button study-finish"
      type="button"
      @click="finish"
    >
      Terminar estudio
    </button>
  </section>
  <section v-else class="screen">
    <p>No hay una sesión de estudio activa.</p>
    <RouterLink class="button primary" :to="{ name: 'choose-challenge', query: { experience: 'study' } }">
      Elegir contenido
    </RouterLink>
  </section>
</template>
