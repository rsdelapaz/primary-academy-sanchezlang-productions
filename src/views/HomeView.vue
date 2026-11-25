<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { GAME_MODES } from '../domain/game'
import { contentService } from '../content/service'
import { findRecommendedChallenge, type RecommendedChallenge } from '../application/recommended-challenge'
import { startGame } from '../presentation/game-session'
import { useCatalog } from '../presentation/catalog'

const router = useRouter()
const { manifest, loading, error, loadManifest } = useCatalog()
const recommendation = shallowRef<RecommendedChallenge | null>(null)
const recommendationLoading = ref(false)
const recommendationError = ref('')
const quickStarting = ref(false)
const quickPlayError = ref('')
const topicCards = computed(() => manifest.value?.subjects.flatMap((subject) =>
  subject.topics.map((topic) => ({ subject, topic })),
) ?? [])
const modeTitle = computed(() => GAME_MODES.find(({ id }) => id === recommendation.value?.modeId)?.title ?? '')

onMounted(async () => {
  const catalog = await loadManifest()
  if (!catalog) return
  recommendationLoading.value = true
  try {
    recommendation.value = await findRecommendedChallenge(catalog, contentService.loadPackage)
  } catch (caught) {
    recommendationError.value = caught instanceof Error ? caught.message : 'No se pudo preparar el reto recomendado.'
  } finally {
    recommendationLoading.value = false
  }
})

async function startRecommended() {
  const challenge = recommendation.value
  if (!challenge || quickStarting.value) return
  quickStarting.value = true
  quickPlayError.value = ''
  try {
    startGame(
      challenge.subject.id,
      challenge.topic.id,
      challenge.content,
      challenge.configuration,
    )
    await router.push({
      name: 'play',
      params: {
        subjectId: challenge.subject.id,
        topicId: challenge.topic.id,
        modeId: challenge.modeId,
      },
    })
  } catch (caught) {
    quickPlayError.value = caught instanceof Error ? caught.message : 'No se pudo iniciar el reto.'
  } finally {
    quickStarting.value = false
  }
}
</script>

<template>
  <section class="screen home-screen" aria-labelledby="home-title">
    <header class="home-intro">
      <span class="hero-motifs" aria-hidden="true">✦ ♡ ♪</span>
      <p class="eyebrow">Tu próxima aventura empieza aquí</p>
      <h1 id="home-title">¡Hola, RetoNauta!</h1>
      <p>Explora ideas, supera retos y celebra cada descubrimiento.</p>
      <RouterLink class="button secondary choose-challenge-link" :to="{ name: 'choose-challenge' }">
        Elegir mi reto
      </RouterLink>
    </header>

    <section class="card recommended-card" aria-labelledby="recommended-title">
      <div v-if="recommendation" class="recommended-content">
        <div class="recommendation-heading">
          <span class="recommendation-icon" aria-hidden="true">✦</span>
          <div>
            <p class="eyebrow">Reto recomendado</p>
            <h2 id="recommended-title">{{ recommendation.topic.title }}</h2>
          </div>
        </div>
        <dl class="challenge-details">
          <div><dt>Materia</dt><dd>{{ recommendation.subject.title }}</dd></div>
          <div><dt>Tema</dt><dd>{{ recommendation.topic.title }}</dd></div>
          <div><dt>Modalidad</dt><dd>{{ modeTitle }}</dd></div>
          <div><dt>Duración</dt><dd>{{ recommendation.configuration.duration.questionCount }} retos</dd></div>
          <div><dt>Dificultad</dt><dd>Inicial</dd></div>
        </dl>
        <button
          class="button primary play-now"
          type="button"
          :disabled="quickStarting"
          @click="startRecommended"
        >{{ quickStarting ? 'Preparando...' : '¡JUGAR!' }}</button>
      </div>
      <p v-else-if="recommendationLoading || loading" class="recommendation-status" role="status">
        Preparando una aventura para ti...
      </p>
      <p v-else-if="recommendationError || error" class="error" role="alert">
        {{ recommendationError || error }}
      </p>
      <p v-else class="recommendation-status">
        Todavía no hay retos iniciales disponibles.
      </p>
      <p v-if="quickPlayError" class="error" role="alert">{{ quickPlayError }}</p>
    </section>

    <section class="home-catalog" aria-labelledby="catalog-title">
      <div class="catalog-heading-row">
        <div>
          <p class="eyebrow">Siempre hay algo nuevo</p>
          <h2 id="catalog-title">Elige una aventura</h2>
        </div>
      </div>
      <nav v-if="topicCards.length" class="content-card-grid" aria-label="Retos disponibles">
        <RouterLink
          v-for="{ subject, topic } in topicCards"
          :key="`${subject.id}:${topic.id}`"
          class="content-card"
          :to="{
            name: 'choose-challenge',
            params: { subjectId: subject.id, topicId: topic.id, modeId: 'classic' },
          }"
        >
          <span class="content-card-icon" aria-hidden="true">✧</span>
          <span class="content-card-copy">
            <small>{{ subject.title }}</small>
            <strong>{{ topic.title }}</strong>
            <span>Elige cómo jugar →</span>
          </span>
        </RouterLink>
      </nav>
      <p v-else-if="!loading && !error" class="muted">Todavía no hay contenidos disponibles.</p>
    </section>
  </section>
</template>
