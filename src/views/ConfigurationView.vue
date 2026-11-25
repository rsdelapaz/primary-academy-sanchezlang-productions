<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import type { ContentManifest, ContentPackage, ContentSubject, ContentTopicReference } from '../domain/content'
import {
  DURATION_PRESETS,
  GAME_MODES,
  QUICK_PLAY_COUNT,
  getEligibleExercises,
  getPresetCount,
  type DifficultyFilter,
  type DurationPreset,
  type GameConfiguration,
  type GameModeId,
} from '../domain/game'
import { contentService } from '../content/service'
import { startGame } from '../presentation/game-session'

const route = useRoute()
const router = useRouter()
const manifest = shallowRef<ContentManifest | null>(null)
const content = shallowRef<ContentPackage | null>(null)
const loadingCatalog = ref(true)
const loadingBank = ref(false)
const error = ref('')
const startError = ref('')
const subjectId = ref('')
const topicId = ref('')
const modeId = ref<GameModeId>('classic')
const difficulty = ref<DifficultyFilter>('beginner')
const duration = ref<DurationPreset | 'custom'>('medium')
const customCount = ref(QUICK_PLAY_COUNT)
let bankRequest = 0

const selectedSubject = computed(() => manifest.value?.subjects.find(({ id }) => id === subjectId.value) ?? null)
const selectedTopic = computed(() => selectedSubject.value?.topics.find(({ id }) => id === topicId.value) ?? null)
const selectedMode = computed(() => GAME_MODES.find(({ id }) => id === modeId.value) ?? null)
const isLoading = computed(() => loadingCatalog.value || loadingBank.value)
const availableCount = computed(() => content.value
  ? getEligibleExercises(content.value.exercises, difficulty.value).length
  : 0)
const selectedCount = computed(() => duration.value === 'custom' ? customCount.value : getPresetCount(duration.value))
const availableDifficulties = computed(() => {
  const choices = [
    { id: 'beginner' as const, title: 'Inicial', icon: '🌱' },
    { id: 'intermediate' as const, title: 'Intermedia', icon: '🧭' },
    { id: 'advanced' as const, title: 'Avanzada', icon: '🚀' },
  ].filter(({ id }) => countForDifficulty(id) > 0)
  return choices.length > 1 ? [...choices, { id: 'all' as const, title: 'Todas', icon: '✨' }] : choices
})
const availableDurations = computed(() => DURATION_PRESETS.filter(({ count }) => count <= availableCount.value))
const canStart = computed(() =>
  Number.isSafeInteger(selectedCount.value) && selectedCount.value > 0 &&
  selectedCount.value <= availableCount.value && Boolean(selectedSubject.value && selectedTopic.value && selectedMode.value) &&
  !isLoading.value,
)

function countForDifficulty(value: DifficultyFilter): number {
  return content.value ? getEligibleExercises(content.value.exercises, value).length : 0
}

function normalizeSettings(initial = false) {
  const levels = (['beginner', 'intermediate', 'advanced'] as const)
    .filter((level) => countForDifficulty(level) > 0)
  if (levels.length === 1) difficulty.value = levels[0]
  else if (difficulty.value !== 'all' && !levels.includes(difficulty.value)) {
    difficulty.value = levels[0] ?? 'beginner'
  }

  const count = countForDifficulty(difficulty.value)
  if (initial) {
    duration.value = count >= getPresetCount('medium')
      ? 'medium'
      : count >= getPresetCount('short')
        ? 'short'
        : 'custom'
    customCount.value = Math.min(QUICK_PLAY_COUNT, count)
    return
  }

  if (duration.value === 'custom') {
    customCount.value = Math.min(Math.max(1, customCount.value), count)
    return
  }
  const currentPreset = DURATION_PRESETS.find(({ id }) => id === duration.value)
  if (currentPreset && currentPreset.count <= count) return
  const fallback = DURATION_PRESETS.filter(({ count: presetCount }) => presetCount <= count).at(-1)
  if (fallback) duration.value = fallback.id
  else {
    duration.value = 'custom'
    customCount.value = Math.min(QUICK_PLAY_COUNT, count)
  }
}

async function loadSelectedBank(initial = false) {
  const subject = selectedSubject.value
  const topic = selectedTopic.value
  if (!subject || !topic) {
    content.value = null
    return
  }

  const request = ++bankRequest
  loadingBank.value = true
  error.value = ''
  content.value = null
  try {
    const bank = await contentService.loadPackage(subject, topic)
    if (request !== bankRequest) return
    content.value = bank
    normalizeSettings(initial)
  } catch (caught) {
    if (request === bankRequest) {
      error.value = caught instanceof Error ? caught.message : 'No se pudo cargar el contenido.'
    }
  } finally {
    if (request === bankRequest) loadingBank.value = false
  }
}

async function syncRoute() {
  if (!subjectId.value || !topicId.value || !modeId.value) return
  const current = router.currentRoute.value
  if (current.name === 'choose-challenge' &&
    current.params.subjectId === subjectId.value &&
    current.params.topicId === topicId.value &&
    current.params.modeId === modeId.value) return
  await router.replace({
    name: 'choose-challenge',
    params: { subjectId: subjectId.value, topicId: topicId.value, modeId: modeId.value },
  })
}

async function selectSubject(subject: ContentSubject) {
  if (subject.id === subjectId.value) return
  subjectId.value = subject.id
  topicId.value = subject.topics[0]?.id ?? ''
  await loadSelectedBank()
  await syncRoute()
}

async function selectTopic(topic: ContentTopicReference) {
  if (topic.id === topicId.value) return
  topicId.value = topic.id
  await loadSelectedBank()
  await syncRoute()
}

async function selectMode(value: GameModeId) {
  modeId.value = value
  await syncRoute()
}

function selectDifficulty(value: DifficultyFilter) {
  difficulty.value = value
  normalizeSettings()
}

function selectDuration(value: DurationPreset | 'custom') {
  duration.value = value
  if (value === 'custom') customCount.value = Math.min(QUICK_PLAY_COUNT, availableCount.value)
}

async function initialize() {
  loadingCatalog.value = true
  error.value = ''
  try {
    manifest.value = await contentService.loadManifest()
    const subject = manifest.value.subjects.find(({ id }) => id === route.params.subjectId)
      ?? manifest.value.subjects[0]
    if (!subject) return
    subjectId.value = subject.id
    const topic = subject.topics.find(({ id }) => id === route.params.topicId) ?? subject.topics[0]
    if (!topic) return
    topicId.value = topic.id
    modeId.value = GAME_MODES.find(({ id }) => id === route.params.modeId)?.id ?? GAME_MODES[0].id
    await loadSelectedBank(true)
    await syncRoute()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo preparar la configuración.'
  } finally {
    loadingCatalog.value = false
  }
}

async function begin() {
  const subject = selectedSubject.value
  const topic = selectedTopic.value
  const bank = content.value
  const mode = selectedMode.value
  if (!canStart.value || !subject || !topic || !bank || !mode) return
  startError.value = ''
  try {
    const configuration: GameConfiguration = {
      duration: duration.value === 'custom'
        ? { kind: 'custom', questionCount: customCount.value }
        : { kind: 'preset', preset: duration.value, questionCount: getPresetCount(duration.value) },
      difficulty: difficulty.value,
    }
    startGame(subject.id, topic.id, bank, configuration)
    await router.push({
      name: 'play',
      params: { subjectId: subject.id, topicId: topic.id, modeId: mode.id },
    })
  } catch (caught) {
    startError.value = caught instanceof Error ? caught.message : 'No se pudo iniciar el reto.'
  }
}

onMounted(() => { void initialize() })
</script>

<template>
  <section class="screen configuration-screen" aria-labelledby="configuration-title">
    <RouterLink class="back-link" :to="{ name: 'home' }">← Inicio</RouterLink>
    <header class="configuration-heading">
      <p class="eyebrow">Tu próxima expedición</p>
      <h1 id="configuration-title">Elige tu reto</h1>
      <p class="lead">Escoge una aventura; lo demás ya está preparado para empezar.</p>
    </header>

    <p v-if="loadingCatalog" class="loading-message" role="status">Cargando tus aventuras...</p>
    <p v-else-if="error && !content" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!manifest?.subjects.length" class="empty-message">Todavía no hay aventuras disponibles.</p>
    <p v-else-if="!selectedSubject || !selectedTopic" class="empty-message">Esta materia todavía no tiene temas disponibles.</p>
    <template v-else>
      <div class="configuration-layout">
        <div class="essential-choices">
          <section v-if="manifest.subjects.length > 1" class="selection-section" aria-labelledby="subject-choice-title">
            <h2 id="subject-choice-title">¿Qué quieres explorar?</h2>
            <div class="selection-card-grid" role="group" aria-label="Elige una materia">
              <button
                v-for="subject in manifest.subjects"
                :key="subject.id"
                class="selection-card"
                :class="{ active: subjectId === subject.id }"
                type="button"
                :aria-pressed="subjectId === subject.id"
                :disabled="loadingBank"
                @click="selectSubject(subject)"
              >
                <span class="selection-card-icon" aria-hidden="true">✦</span>
                <strong>{{ subject.title }}</strong>
                <small>{{ subject.topics.length }} temas</small>
              </button>
            </div>
          </section>
          <div v-else class="selection-summary">
            <span>Materia</span><strong>{{ selectedSubject.title }}</strong>
          </div>

          <section v-if="selectedSubject.topics.length > 1" class="selection-section" aria-labelledby="topic-choice-title">
            <h2 id="topic-choice-title">Elige un tema</h2>
            <div class="selection-card-grid" role="group" aria-label="Elige un tema">
              <button
                v-for="topic in selectedSubject.topics"
                :key="topic.id"
                class="selection-card"
                :class="{ active: topicId === topic.id }"
                type="button"
                :aria-pressed="topicId === topic.id"
                :disabled="loadingBank"
                @click="selectTopic(topic)"
              >
                <span class="selection-card-icon" aria-hidden="true">✧</span>
                <strong>{{ topic.title }}</strong>
                <small>Explora y aprende</small>
              </button>
            </div>
          </section>
          <div v-else class="selection-summary">
            <span>Tema</span><strong>{{ selectedTopic.title }}</strong>
          </div>

          <section v-if="GAME_MODES.length > 1" class="selection-section" aria-labelledby="mode-choice-title">
            <h2 id="mode-choice-title">¿Cómo quieres jugar?</h2>
            <div class="selection-card-grid" role="group" aria-label="Elige una modalidad">
              <button
                v-for="mode in GAME_MODES"
                :key="mode.id"
                class="selection-card"
                :class="{ active: modeId === mode.id }"
                type="button"
                :aria-pressed="modeId === mode.id"
                @click="selectMode(mode.id)"
              >
                <span class="selection-card-icon" aria-hidden="true">⚡</span>
                <strong>{{ mode.title }}</strong>
                <small>Responde a tu ritmo</small>
              </button>
            </div>
          </section>
          <div v-else class="selection-summary">
            <span>Modalidad</span><strong>{{ selectedMode?.title }}</strong>
          </div>
        </div>

        <aside class="configuration-preview" aria-live="polite">
          <span class="preview-icon" aria-hidden="true">✦</span>
          <p class="eyebrow">Tu aventura</p>
          <h2>{{ selectedTopic.title }}</h2>
          <div class="preview-details">
            <span>{{ selectedCount }} retos</span>
            <span>{{ difficulty === 'beginner' ? 'Inicial' : difficulty === 'intermediate' ? 'Intermedia' : difficulty === 'advanced' ? 'Avanzada' : 'Todas' }}</span>
          </div>
          <p v-if="content" class="available-count">{{ availableCount }} retos compatibles</p>
        </aside>
      </div>

      <details class="advanced-options">
        <summary>
          <span>Ajustar dificultad y duración</span>
          <small>Opcional · puedes cambiarlo cuando quieras</small>
        </summary>
        <div class="advanced-options-content">
          <section v-if="availableDifficulties.length > 1" class="selection-section" aria-labelledby="difficulty-title">
            <h2 id="difficulty-title">Dificultad</h2>
            <div class="choice-grid difficulty-grid" role="group" aria-label="Elige la dificultad">
              <button
                v-for="option in availableDifficulties"
                :key="option.id"
                class="choice-card"
                :class="{ active: difficulty === option.id }"
                type="button"
                :aria-pressed="difficulty === option.id"
                @click="selectDifficulty(option.id)"
              >
                <span class="choice-icon" aria-hidden="true">{{ option.icon }}</span>
                <span class="choice-title">{{ option.title }}</span>
                <span class="choice-detail">{{ countForDifficulty(option.id) }} retos</span>
              </button>
            </div>
          </section>

          <section v-if="availableDurations.length > 1" class="selection-section" aria-labelledby="duration-title">
            <h2 id="duration-title">Duración</h2>
            <div class="choice-grid duration-grid" role="group" aria-label="Elige la duración">
              <button
                v-for="preset in availableDurations"
                :key="preset.id"
                class="choice-card"
                :class="{ active: duration === preset.id }"
                type="button"
                :aria-pressed="duration === preset.id"
                @click="selectDuration(preset.id)"
              >
                <span class="choice-icon" aria-hidden="true">{{ preset.id === 'short' ? '⚡' : preset.id === 'medium' ? '🗺️' : '🏆' }}</span>
                <span class="choice-title">{{ preset.title }}</span>
                <span class="choice-detail">{{ preset.count }} retos</span>
              </button>
            </div>
          </section>
          <div v-else class="selection-summary">
            <span>Duración</span><strong>{{ availableCount }} retos disponibles</strong>
          </div>

          <button
            class="choice-card custom-duration-card"
            :class="{ active: duration === 'custom' }"
            type="button"
            :aria-pressed="duration === 'custom'"
            :disabled="availableCount === 0"
            @click="selectDuration('custom')"
          >
            <span class="choice-icon" aria-hidden="true">🎯</span>
            <span class="choice-title">A mi ritmo</span>
            <span class="choice-detail">Elige cuántos retos</span>
          </button>
          <label v-if="duration === 'custom' && availableCount > 0" class="field-label" for="custom-count">Número de retos</label>
          <input
            v-if="duration === 'custom' && availableCount > 0"
            id="custom-count"
            v-model.number="customCount"
            class="select-control"
            type="number"
            min="1"
            :max="availableCount"
          />
          <p class="configuration-note">No repetiremos ningún reto y puedes cambiar estos ajustes antes de empezar.</p>
        </div>
      </details>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="availableCount === 0 && !isLoading" class="error" role="alert">No hay retos compatibles con esta selección.</p>
      <p v-if="startError" class="error" role="alert">{{ startError }}</p>
      <button class="button primary start-game" type="button" :disabled="!canStart" @click="begin">
        {{ isLoading ? 'Preparando...' : '¡A jugar!' }}
      </button>
    </template>
  </section>
</template>
