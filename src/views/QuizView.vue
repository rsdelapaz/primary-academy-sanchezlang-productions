<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { initializeSession } from '../game/session'

const router = useRouter()
const loading = ref(false)
const error = ref('')

async function startQuiz() {
  loading.value = true
  error.value = ''
  try {
    const { irregularVerbs } = await import('../content/irregular-verbs')
    initializeSession(irregularVerbs)
    await router.push('/juego')
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo iniciar la partida.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section
    class="screen"
    aria-labelledby="quiz-title"
  >
    <RouterLink
      class="back-link"
      to="/ingles/irregular-verbs"
    >← Temas</RouterLink>
    <div class="card quiz-intro">
      <p class="eyebrow">
        Modalidad clásica
      </p>
      <h1 id="quiz-title">
        ¿Listo para explorar?
      </h1>
      <ul>
        <li>18 ejercicios</li>
        <li>Retroalimentación inmediata</li>
        <li>Revisión al terminar</li>
      </ul>
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
      <button
        class="button primary"
        type="button"
        :disabled="loading"
        @click="startQuiz"
      >
        {{ loading ? 'Preparando...' : 'Comenzar partida' }}
      </button>
    </div>
  </section>
</template>
