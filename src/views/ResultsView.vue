<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { resetSession, getScore, session } from '../game/session'

const router = useRouter()
const loading = ref(false)
const score = computed(() => session.value ? getScore(session.value) : { correct: 0, total: 0, percentage: 0 })

async function restart() {
  loading.value = true
  const { irregularVerbs } = await import('../content/irregular-verbs')
  resetSession(irregularVerbs)
  await router.push('/juego')
  loading.value = false
}
</script>

<template>
  <section
    v-if="session"
    class="screen"
    aria-labelledby="results-title"
  >
    <div class="card results-card">
      <p class="eyebrow">
        Expedición completada
      </p>
      <div
        class="score-ring"
        :style="{ '--score': `${score.percentage * 3.6}deg` }"
      >
        <strong>{{ score.percentage }}%</strong>
      </div>
      <h1 id="results-title">
        {{ score.correct }} de {{ score.total }} correctas
      </h1>
      <p>{{ score.percentage >= 70 ? '¡Gran trabajo, explorador/a!' : 'Cada error te acerca a la respuesta. ¡Pruébalo otra vez!' }}</p>
      <div class="action-row">
        <RouterLink
          class="button secondary"
          to="/revision"
        >Revisar errores</RouterLink>
        <button
          class="button primary"
          type="button"
          :disabled="loading"
          @click="restart"
        >
          {{ loading ? 'Preparando...' : 'Jugar otra vez' }}
        </button>
      </div>
    </div>
  </section>
  <section
    v-else
    class="screen"
  >
    <p>No hay resultados disponibles.</p>
  </section>
</template>
