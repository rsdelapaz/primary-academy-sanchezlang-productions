<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  isFlashcardExercise,
  isGameExercise,
  isSingleChoiceExercise,
  isTypedAnswerExercise,
  type ExerciseBase,
  type ContentManifest,
  type ContentPackage,
  type ContentSubject,
  type ContentTopicReference,
  type GameExercise,
} from '../domain/content'
import {
  DURATION_PRESETS,
  GAME_MODES,
  QUICK_PLAY_COUNT,
  getMixedExerciseDistribution,
  getEligibleExercises,
  getPresetCount,
  type DifficultyFilter,
  type DurationPreset,
  type GameAnswerFormat,
  type GameConfiguration,
  type GameModeId,
} from '../domain/game'
import type { ActivityConfiguration } from '../domain/activity-configuration'
import { getDefaultGameModeId, isGameModeCompatible } from '../domain/game-modes'
import { contentService } from '../content/service'
import { startGame } from '../presentation/game-session'
import { startStudy } from '../presentation/study-session'

type Experience = 'play' | 'study'
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
const experience = ref<Experience>('play')
const modeId = ref<GameModeId | null>(null)
const answerFormat = ref<GameAnswerFormat>('selection')
const difficulty = ref<DifficultyFilter>('beginner')
const duration = ref<DurationPreset | 'custom'>('medium')
const customCount = ref(QUICK_PLAY_COUNT)
let bankRequest = 0

const selectedSubject = computed(() => manifest.value?.subjects.find(({ id }) => id === subjectId.value) ?? null)
const selectedTopic = computed(() => selectedSubject.value?.topics.find(({ id }) => id === topicId.value) ?? null)
const selectedMode = computed(() => GAME_MODES.find(({ id }) => id === modeId.value) ?? null)
const isLoading = computed(() => loadingCatalog.value || loadingBank.value)
const modeCompatibleExercises = computed<GameExercise[]>(() => {
  const mode = modeId.value
  if (!mode) return []
  return (content.value?.exercises ?? []).filter((exercise): exercise is GameExercise =>
    isGameExercise(exercise) && isGameModeCompatible(mode, exercise.type),
  )
})
const availableAnswerFormats = computed(() => {
  const hasSelection = modeCompatibleExercises.value.some(isSingleChoiceExercise)
  const hasWritten = modeCompatibleExercises.value.some(isTypedAnswerExercise)
  const options: { id: GameAnswerFormat; title: string; description: string }[] = []
  if (hasSelection) {
    options.push({ id: 'selection', title: 'Selección', description: 'Elige entre varias respuestas.' })
  }
  if (hasSelection && hasWritten) {
    options.push({ id: 'mixed', title: 'Mixto', description: 'Combina respuestas elegidas y escritas.' })
  }
  if (hasWritten) {
    options.push({ id: 'written', title: 'Sin pistas', description: 'Escribe la respuesta de memoria.' })
  }
  return options
})
const compatibleExercises = computed<ExerciseBase[]>(() => {
  const exercises = content.value?.exercises ?? []
  if (experience.value === 'study') return exercises.filter(isFlashcardExercise)
  return getExercisesForFormat(modeCompatibleExercises.value, answerFormat.value, 'all')
})
const availableCount = computed(() => experience.value === 'study'
  ? getEligibleExercises(compatibleExercises.value, difficulty.value).length
  : getExercisesForFormat(modeCompatibleExercises.value, answerFormat.value, difficulty.value).length)
const selectedCount = computed(() => duration.value === 'custom' ? customCount.value : getPresetCount(duration.value))
const activityNoun = computed(() => experience.value === 'study' ? 'tarjetas' : 'retos')
const mixedDistribution = computed(() => {
  if (!Number.isSafeInteger(selectedCount.value) || selectedCount.value < 1) {
    return { singleChoice: 0, typedAnswer: 0 }
  }
  const exercises = getEligibleExercises(modeCompatibleExercises.value, difficulty.value)
  return getMixedExerciseDistribution(exercises, selectedCount.value)
})
const mixedSelectedCount = computed(() => mixedDistribution.value.singleChoice + mixedDistribution.value.typedAnswer)
const selectedFormatTitle = computed(() =>
  availableAnswerFormats.value.find(({ id }) => id === answerFormat.value)?.title ?? 'Selección',
)
const availableDifficulties = computed(() => {
  const choices = [
    { id: 'beginner' as const, title: 'Inicial', icon: '🌱' },
    { id: 'intermediate' as const, title: 'Intermedia', icon: '🧭' },
    { id: 'advanced' as const, title: 'Avanzada', icon: '🚀' },
  ].filter(({ id }) => countForDifficulty(id) > 0)
  return choices.length > 1 || (choices.length === 0 && countForDifficulty('all') > 0)
    ? [...choices, { id: 'all' as const, title: 'Todas', icon: '✨' }]
    : choices
})
const availableDurations = computed(() => DURATION_PRESETS.filter(({ count }) => count <= availableCount.value))
const canStart = computed(() =>
  Number.isSafeInteger(selectedCount.value) && selectedCount.value > 0 &&
  selectedCount.value <= availableCount.value && Boolean(selectedSubject.value && selectedTopic.value) &&
  (experience.value === 'study' || Boolean(selectedMode.value)) &&
  (experience.value === 'study' || availableAnswerFormats.value.some(({ id }) => id === answerFormat.value)) &&
  (experience.value !== 'play' || answerFormat.value !== 'mixed' ||
    (selectedCount.value >= 2 && mixedDistribution.value.singleChoice > 0 &&
      mixedDistribution.value.typedAnswer > 0 && mixedSelectedCount.value === selectedCount.value)) &&
  !isLoading.value,
)

function countForDifficulty(value: DifficultyFilter): number {
  if (experience.value === 'study') return getEligibleExercises(compatibleExercises.value, value).length
  return getExercisesForFormat(modeCompatibleExercises.value, answerFormat.value, value).length
}

function getExercisesForFormat(
  exercises: readonly GameExercise[],
  format: GameAnswerFormat,
  difficultyFilter: DifficultyFilter,
): GameExercise[] {
  const eligible = getEligibleExercises(exercises, difficultyFilter)
  if (format === 'selection') return eligible.filter(isSingleChoiceExercise)
  if (format === 'written') return eligible.filter(isTypedAnswerExercise)
  const hasSelection = eligible.some(isSingleChoiceExercise)
  const hasWritten = eligible.some(isTypedAnswerExercise)
  return hasSelection && hasWritten ? eligible : []
}

function normalizeSettings(initial = false) {
  const levels = (['beginner', 'intermediate', 'advanced'] as const)
    .filter((level) => countForDifficulty(level) > 0)
  const allAvailable = countForDifficulty('all') > 0
  if (levels.length === 1) difficulty.value = levels[0]
  else if (difficulty.value === 'all' ? !allAvailable : !levels.includes(difficulty.value)) {
    difficulty.value = levels[0] ?? (allAvailable ? 'all' : 'beginner')
  }

  const count = countForDifficulty(difficulty.value)
  if (initial) {
    duration.value = count >= getPresetCount('medium')
      ? 'medium'
      : count >= getPresetCount('short')
        ? 'short'
        : 'custom'
    customCount.value = Math.min(QUICK_PLAY_COUNT, count)
    if (answerFormat.value === 'mixed' && count >= 2) customCount.value = Math.max(2, customCount.value)
    return
  }

  if (duration.value === 'custom') {
    const minimum = answerFormat.value === 'mixed' ? 2 : 1
    customCount.value = Math.min(Math.max(minimum, customCount.value), count)
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

watch(availableAnswerFormats, (formats) => {
  if (experience.value !== 'play' || formats.length === 0 ||
    formats.some(({ id }) => id === answerFormat.value)) return
  answerFormat.value = formats[0].id
  normalizeSettings(true)
})

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
  if (!subjectId.value || !topicId.value || (experience.value === 'play' && !modeId.value)) return
  const current = router.currentRoute.value
  const nextModeId = experience.value === 'play' ? modeId.value : undefined
  const nextExperience = experience.value === 'study' ? 'study' : undefined
  const nextQuery = nextExperience ? { experience: nextExperience } : {}
  if (current.name === 'choose-challenge' &&
    current.params.subjectId === subjectId.value &&
    current.params.topicId === topicId.value &&
    current.params.modeId === nextModeId &&
    current.query.experience === nextExperience) return
  await router.replace({
    name: 'choose-challenge',
    params: { subjectId: subjectId.value, topicId: topicId.value, modeId: nextModeId },
    query: nextQuery,
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
  normalizeSettings()
  await syncRoute()
}

function selectAnswerFormat(value: GameAnswerFormat) {
  if (!availableAnswerFormats.value.some(({ id }) => id === value)) return
  answerFormat.value = value
  normalizeSettings(true)
}

async function selectExperience(value: Experience) {
  if (experience.value === value) return
  experience.value = value
  normalizeSettings(true)
  await syncRoute()
}

function selectDifficulty(value: DifficultyFilter) {
  difficulty.value = value
  normalizeSettings()
}

function selectDuration(value: DurationPreset | 'custom') {
  duration.value = value
  if (value === 'custom') {
    const minimum = answerFormat.value === 'mixed' ? 2 : 1
    customCount.value = Math.min(Math.max(minimum, QUICK_PLAY_COUNT), availableCount.value)
  }
}

async function initialize() {
  loadingCatalog.value = true
  error.value = ''
  try {
    manifest.value = await contentService.loadManifest()
    experience.value = route.query.experience === 'study' ? 'study' : 'play'
    const subject = manifest.value.subjects.find(({ id }) => id === route.params.subjectId)
      ?? manifest.value.subjects[0]
    if (!subject) return
    subjectId.value = subject.id
    const topic = subject.topics.find(({ id }) => id === route.params.topicId) ?? subject.topics[0]
    if (!topic) return
    topicId.value = topic.id
    modeId.value = GAME_MODES.find(({ id }) => id === route.params.modeId)?.id ?? getDefaultGameModeId()
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
  if (!canStart.value || !subject || !topic || !bank) return
  startError.value = ''
  try {
    const activityConfiguration: ActivityConfiguration = {
      duration: duration.value === 'custom'
        ? { kind: 'custom', questionCount: customCount.value }
        : { kind: 'preset', preset: duration.value, questionCount: getPresetCount(duration.value) },
      difficulty: difficulty.value,
    }
    if (experience.value === 'study') {
      startStudy(subject.id, topic.id, bank, activityConfiguration)
      await router.push({ name: 'study', params: { subjectId: subject.id, topicId: topic.id } })
    } else {
      if (!mode) return
      const configuration: GameConfiguration = { ...activityConfiguration, answerFormat: answerFormat.value }
      startGame(subject.id, topic.id, bank, mode.id, configuration)
      await router.push({
        name: 'play',
        params: { subjectId: subject.id, topicId: topic.id, modeId: mode.id },
      })
    }
  } catch (caught) {
    startError.value = caught instanceof Error
      ? caught.message
      : experience.value === 'study' ? 'No se pudo iniciar el estudio.' : 'No se pudo iniciar el reto.'
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

          <section class="selection-section" aria-labelledby="experience-choice-title">
            <h2 id="experience-choice-title">¿Qué quieres hacer?</h2>
            <div class="selection-card-grid" role="group" aria-label="Elige un área">
              <button
                class="selection-card"
                :class="{ active: experience === 'play' }"
                type="button"
                :aria-pressed="experience === 'play'"
                @click="selectExperience('play')"
              >
                <span class="selection-card-icon" aria-hidden="true">⚡</span>
                <strong>Jugar</strong>
                <small>Supera retos y gana puntos.</small>
              </button>
              <button
                class="selection-card"
                :class="{ active: experience === 'study' }"
                type="button"
                :aria-pressed="experience === 'study'"
                @click="selectExperience('study')"
              >
                <span class="selection-card-icon" aria-hidden="true">🗂️</span>
                <strong>Estudiar</strong>
                <small>Repasa con tarjetas a tu ritmo.</small>
              </button>
            </div>
          </section>

          <section v-if="experience === 'play' && GAME_MODES.length > 1" class="selection-section" aria-labelledby="mode-choice-title">
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
                <span class="mode-art" aria-hidden="true">
                  <svg v-if="mode.illustration === 'lightning'" viewBox="0 0 64 64">
                    <path d="M36 4 13 35h15l-3 25 27-36H36z" fill="currentColor" />
                    <circle cx="49" cy="12" r="5" fill="var(--color-reward)" />
                  </svg>
                  <svg v-else viewBox="0 0 64 64">
                    <path d="M9 24h46v31H9z" fill="currentColor" />
                    <path d="M7 18h50v12H7z" fill="var(--color-accent-secondary)" />
                    <path d="M27 33h10v22H27z" fill="var(--color-reward)" />
                    <circle cx="32" cy="39" r="2" fill="var(--color-text)" />
                    <path d="M12 18v-6h40v6" fill="none" stroke="currentColor" stroke-width="4" />
                  </svg>
                </span>
                <strong>{{ mode.title }}</strong>
                <small>{{ mode.description }}</small>
              </button>
            </div>
          </section>
          <div v-else-if="experience === 'play'" class="selection-summary">
            <span>Modalidad</span><strong>{{ selectedMode?.title }}</strong>
          </div>
          <div v-else class="selection-summary">
            <span>Experiencia</span><strong>Tarjetas de memoria</strong>
          </div>

          <section
            v-if="experience === 'play' && availableAnswerFormats.length > 1"
            class="selection-section"
            aria-labelledby="answer-format-title"
          >
            <h2 id="answer-format-title">¿Cómo responderás?</h2>
            <div class="selection-card-grid" role="group" aria-label="Elige el formato de respuesta">
              <button
                v-for="format in availableAnswerFormats"
                :key="format.id"
                class="selection-card"
                :class="{ active: answerFormat === format.id }"
                type="button"
                :aria-pressed="answerFormat === format.id"
                :disabled="loadingBank"
                @click="selectAnswerFormat(format.id)"
              >
                <span class="selection-card-icon" aria-hidden="true">
                  {{ format.id === 'selection' ? '◉' : format.id === 'mixed' ? '⇄' : '✎' }}
                </span>
                <strong>{{ format.title }}</strong>
                <small>{{ format.description }}</small>
                <small v-if="format.id === 'mixed' && difficulty === 'advanced'" class="format-recommendation">
                  Recomendado para dificultad avanzada
                </small>
              </button>
            </div>
            <p v-if="answerFormat === 'mixed'" class="configuration-note" role="status">
              <span v-if="selectedCount < 2">El formato mixto requiere al menos 2 retos.</span>
              <span v-else>
                Distribución disponible: {{ mixedDistribution.singleChoice }} de selección y
                {{ mixedDistribution.typedAnswer }} escritas para {{ selectedCount }} retos.
              </span>
              <span v-if="selectedCount >= 2 &&
                (mixedDistribution.singleChoice === 0 || mixedDistribution.typedAnswer === 0)">
                El banco no ofrece ambos tipos en esta dificultad; elige otra dificultad o formato.
              </span>
              <span v-else-if="selectedCount >= 2 && mixedSelectedCount < selectedCount">
                El banco solo permite {{ mixedSelectedCount }}; reduce la duración para empezar.
              </span>
            </p>
          </section>
          <div v-else-if="experience === 'play'" class="selection-summary">
            <span>Formato</span><strong>{{ selectedFormatTitle }}</strong>
          </div>

        </div>

        <aside class="configuration-preview" aria-live="polite">
          <span class="preview-icon" aria-hidden="true">✦</span>
          <p class="eyebrow">Tu aventura</p>
          <h2>{{ selectedTopic.title }}</h2>
          <div class="preview-details">
            <span>{{ selectedCount }} {{ activityNoun }}</span>
            <span>{{ difficulty === 'beginner' ? 'Inicial' : difficulty === 'intermediate' ? 'Intermedia' : difficulty === 'advanced' ? 'Avanzada' : 'Todas' }}</span>
            <span v-if="experience === 'play'">{{ selectedFormatTitle }}</span>
          </div>
          <p v-if="content" class="available-count">{{ availableCount }} {{ activityNoun }} compatibles</p>
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
                <span class="choice-detail">{{ countForDifficulty(option.id) }} {{ activityNoun }}</span>
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
                <span class="choice-detail">{{ preset.count }} {{ activityNoun }}</span>
              </button>
            </div>
          </section>
          <div v-else class="selection-summary">
            <span>Duración</span><strong>{{ availableCount }} {{ activityNoun }} disponibles</strong>
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
            <span class="choice-detail">Elige cuántas {{ activityNoun }}</span>
          </button>
          <label v-if="duration === 'custom' && availableCount > 0" class="field-label" for="custom-count">
            Número de {{ activityNoun }}
          </label>
          <input
            v-if="duration === 'custom' && availableCount > 0"
            id="custom-count"
            v-model.number="customCount"
            class="select-control"
            type="number"
            :min="answerFormat === 'mixed' ? 2 : 1"
            :max="availableCount"
          />
          <p class="configuration-note">
            {{ experience === 'study' ? 'Las tarjetas difíciles vuelven al final de la cola.' : 'No repetiremos ningún reto.' }}
            Puedes cambiar estos ajustes antes de empezar.
          </p>
        </div>
      </details>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="availableCount === 0 && !isLoading" class="empty-message" role="status">
        {{ experience === 'study'
          ? 'Este tema todavía no tiene tarjetas de memoria. Elige otro contenido para estudiar.'
          : 'No hay retos compatibles con esta selección.' }}
      </p>
      <p v-if="startError" class="error" role="alert">{{ startError }}</p>
      <button
        v-if="availableCount > 0 || isLoading"
        class="button primary start-game"
        type="button"
        :disabled="!canStart"
        @click="begin"
      >
        {{ isLoading ? 'Preparando...' : experience === 'study' ? '¡A estudiar!' : '¡A jugar!' }}
      </button>
    </template>
  </section>
</template>
