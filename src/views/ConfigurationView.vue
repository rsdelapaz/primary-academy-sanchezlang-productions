<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { DURATION_PRESETS, getEligibleExercises, getPresetCount, type DifficultyFilter, type GameConfiguration } from '../domain/game'
import { startGame } from '../presentation/game-session'
import { useCatalogSelection } from '../presentation/catalog-selection'

const route = useRoute()
const router = useRouter()
const { subject, topic, loading, error, load, loadPackage } = useCatalogSelection()
const difficulty = ref<DifficultyFilter>('all')
const duration = ref<'short' | 'medium' | 'long' | 'custom'>('short')
const customCount = ref(1)
const bankCount = ref(0)
const starting = ref(false)
const startError = ref('')
const availableCount = computed(() => bankCount.value)
const selectedCount = computed(() => duration.value === 'custom' ? customCount.value : getPresetCount(duration.value))
const canStart = computed(() =>
  Number.isSafeInteger(selectedCount.value) && selectedCount.value > 0 && selectedCount.value <= availableCount.value &&
  route.params.modeId === 'classic' && Boolean(subject.value && topic.value),
)

async function loadBank() {
  await load()
  if (!subject.value || !topic.value) return
  const content = await loadPackage(subject.value, topic.value)
  if (content) {
    bankCount.value = getEligibleExercises(content.exercises, difficulty.value).length
    customCount.value = Math.min(customCount.value, bankCount.value) || (bankCount.value ? 1 : 0)
  }
}

async function begin() {
  if (!canStart.value || !subject.value || !topic.value) return
  starting.value = true
  startError.value = ''
  try {
    const content = await loadPackage(subject.value, topic.value)
    if (!content) return
    const configuration: GameConfiguration = {
      duration: duration.value === 'custom'
        ? { kind: 'custom', questionCount: customCount.value }
        : { kind: 'preset', preset: duration.value, questionCount: getPresetCount(duration.value) },
      difficulty: difficulty.value,
    }
    startGame(subject.value.id, topic.value.id, content, configuration)
    await router.push({
      name: 'play',
      params: { subjectId: subject.value.id, topicId: topic.value.id, modeId: route.params.modeId },
    })
  } catch (caught) {
    startError.value = caught instanceof Error ? caught.message : 'No se pudo iniciar la partida.'
  } finally {
    starting.value = false
  }
}

async function changeDifficulty() {
  if (!subject.value || !topic.value) return
  const content = await loadPackage(subject.value, topic.value)
  if (content) {
    bankCount.value = getEligibleExercises(content.exercises, difficulty.value).length
    customCount.value = Math.min(customCount.value, bankCount.value) || (bankCount.value ? 1 : 0)
  }
}

onMounted(() => { void loadBank() })
</script>

<template>
  <section
    class="screen"
    aria-labelledby="configuration-title"
  >
    <RouterLink
      class="back-link"
      :to="subject && topic ? { name: 'modes', params: { subjectId: subject.id, topicId: topic.id } } : { name: 'home' }"
    >← Modalidades</RouterLink>
    <p
      v-if="loading"
      role="status"
    >
      Preparando el contenido...
    </p>
    <p
      v-else-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
    <p v-else-if="!subject || !topic">
      No encontramos ese tema o modalidad.
    </p>
    <div
      v-else
      class="card quiz-intro"
    >
      <p class="eyebrow">
        {{ topic.title }}
      </p>
      <h1 id="configuration-title">
        Prepara tu partida
      </h1>
      <label
        class="field-label"
        for="difficulty"
      >Dificultad</label>
      <select
        id="difficulty"
        v-model="difficulty"
        class="select-control"
        @change="changeDifficulty"
      >
        <option value="all">
          Todas
        </option>
        <option value="beginner">
          Inicial
        </option>
        <option value="intermediate">
          Intermedia
        </option>
        <option value="advanced">
          Avanzada
        </option>
      </select>
      <label
        class="field-label"
        for="duration"
      >Duración</label>
      <select
        id="duration"
        v-model="duration"
        class="select-control"
      >
        <option
          v-for="preset in DURATION_PRESETS"
          :key="preset.id"
          :value="preset.id"
          :disabled="preset.count > availableCount"
        >
          {{ preset.title }} · {{ preset.count }}
          {{ preset.count > availableCount ? '(no hay suficientes ejercicios)' : '' }}
        </option>
        <option value="custom">
          Personalizada · {{ availableCount }} disponibles
        </option>
      </select>
      <label
        v-if="duration === 'custom'"
        class="field-label"
        for="custom-count"
      >Cantidad de ejercicios</label>
      <input
        v-if="duration === 'custom'"
        id="custom-count"
        v-model.number="customCount"
        class="select-control"
        type="number"
        min="1"
        :max="availableCount"
      />
      <p>{{ availableCount }} ejercicios compatibles disponibles. No se repetirán preguntas.</p>
      <p
        v-if="route.params.modeId !== 'classic'"
        class="error"
        role="alert"
      >
        Esta modalidad todavía no está operativa.
      </p>
      <p
        v-else-if="!availableCount"
        class="error"
        role="alert"
      >
        No hay ejercicios compatibles con esta configuración.
      </p>
      <p
        v-else-if="!canStart"
        class="error"
        role="alert"
      >
        La duración debe estar dentro del banco disponible.
      </p>
      <p
        v-if="startError"
        class="error"
        role="alert"
      >
        {{ startError }}
      </p>
      <button
        class="button primary"
        type="button"
        :disabled="!canStart || starting || loading"
        @click="begin"
      >
        {{ starting ? 'Preparando...' : 'Comenzar partida' }}
      </button>
    </div>
  </section>
</template>
