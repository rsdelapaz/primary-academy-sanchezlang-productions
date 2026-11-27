<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import TreasureArt from '../components/TreasureArt.vue'
import UniverseArtwork from '../components/UniverseArtwork.vue'
import {
  isFlashcardExercise,
  isGameExercise,
  isSingleChoiceExercise,
  isTypedAnswerExercise,
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
  getEligibleExercises,
  getMixedExerciseDistribution,
  getPresetCount,
  type DifficultyFilter,
  type DurationPreset,
  type GameModeId,
} from '../domain/game'
import type { ActivityConfiguration } from '../domain/activity-configuration'
import { isGameModeCompatible } from '../domain/game-modes'
import { contentService } from '../content/service'
import { startGame } from '../presentation/game-session'
import { startStudy } from '../presentation/study-session'
import { mapQuickSetupToGameConfiguration, type QuickSetupDifficulty } from '../application/quick-game-setup'

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
const difficulty = ref<DifficultyFilter>('intermediate')
const duration = ref<DurationPreset | 'custom'>('medium')
const customCount = ref(QUICK_PLAY_COUNT)
const setupStep = ref<1 | 2 | 3>(1)
const setupDuration = ref<DurationPreset | null>(null)
const setupDifficulty = ref<QuickSetupDifficulty | null>(null)
const autoAdvance = ref(false)
let bankRequest = 0

const difficultyOptions: { id: DifficultyFilter; title: string; description: string }[] = [
  { id: 'beginner', title: 'Fácil', description: 'Para entrar en ritmo.' },
  { id: 'intermediate', title: 'Normal', description: 'Un reto equilibrado.' },
  { id: 'advanced', title: 'Difícil', description: 'Para poner a prueba tus ideas.' },
  { id: 'all', title: 'Variada', description: 'Preguntas de varios niveles.' },
]
const quickDurationOptions: { id: DurationPreset; title: string }[] = [
  { id: 'short', title: 'Corta' },
  { id: 'medium', title: 'Media' },
  { id: 'long', title: 'Larga' },
]
const quickDifficultyOptions: {
  id: QuickSetupDifficulty
  title: string
  description: string
}[] = [
  { id: 'easy', title: 'Fácil', description: 'Un comienzo tranquilo.' },
  { id: 'medium', title: 'Media', description: 'Un reto equilibrado.' },
  { id: 'hard', title: 'Difícil', description: 'Responde sin opciones.' },
]

const selectedSubject = computed(() => manifest.value?.subjects.find(({ id }) => id === subjectId.value) ?? null)
const selectedTopic = computed(() => selectedSubject.value?.topics.find(({ id }) => id === topicId.value) ?? null)
const selectedMode = computed(() => GAME_MODES.find(({ id }) => id === modeId.value) ?? null)
const isLoading = computed(() => loadingCatalog.value || loadingBank.value)
const flashcardExercises = computed(() => content.value?.exercises.filter(isFlashcardExercise) ?? [])
const availableCount = computed(() => getEligibleExercises(flashcardExercises.value, difficulty.value).length)
const selectedCount = computed(() => duration.value === 'custom' ? customCount.value : getPresetCount(duration.value))
const activityNoun = computed(() => 'tarjetas')
const configurationMessage = computed(() => {
  if (isLoading.value || experience.value !== 'study') return ''
  return isStudyDurationAvailable(selectedCount.value)
    ? ''
    : 'No hay suficientes tarjetas para esta combinación. Prueba con menos preguntas o dificultad variada.'
})
const wizardMessage = computed(() => {
  if (isLoading.value || experience.value !== 'play') return ''
  if (setupStep.value === 1 && GAME_MODES.some(({ id }) => !isModeAvailable(id))) {
    return 'Las modalidades deshabilitadas no tienen suficientes preguntas para este tema.'
  }
  const mode = modeId.value
  const preset = setupDuration.value
  if (setupStep.value === 2 && mode) {
    const availableDurations = quickDurationOptions.filter(({ id }) =>
      isGameSetupDurationAvailable(mode, id),
    )
    if (!availableDurations.length) {
      return 'No hay suficientes preguntas para esta modalidad. Vuelve atrás y prueba la otra.'
    }
    if (availableDurations.length < quickDurationOptions.length) {
      return 'Las duraciones deshabilitadas no tienen suficientes preguntas para esta modalidad.'
    }
  }
  if (setupStep.value === 3 && mode && preset) {
    const availableDifficulties = quickDifficultyOptions.filter(({ id }) =>
      isGameSetupAvailable(mode, preset, id),
    )
    const level = setupDifficulty.value
    if (level && !isGameSetupAvailable(mode, preset, level)) {
      return 'No hay suficientes preguntas para esa combinación. Elige otra dificultad o cambia la duración.'
    }
    if (!availableDifficulties.length) {
      return 'No hay suficientes preguntas con esta duración. Vuelve atrás y elige otra.'
    }
    if (availableDifficulties.length < quickDifficultyOptions.length) {
      return 'Las dificultades deshabilitadas no tienen suficientes preguntas para esta modalidad y duración.'
    }
  }
  return ''
})
const canStart = computed(() => {
  if (isLoading.value || !selectedSubject.value || !selectedTopic.value) return false
  if (experience.value === 'study') return isStudyDurationAvailable(selectedCount.value)
  return setupStep.value === 3 &&
    modeId.value !== null &&
    setupDuration.value !== null &&
    setupDifficulty.value !== null &&
    isGameSetupAvailable(modeId.value, setupDuration.value, setupDifficulty.value)
})

function isStudyDurationAvailable(count: number): boolean {
  if (!Number.isSafeInteger(count) || count < 1) return false
  return count <= availableCount.value
}

function isStudyDifficultyAvailable(level: DifficultyFilter): boolean {
  return getEligibleExercises(flashcardExercises.value, level).length > 0
}

function getModeCompatibleExercises(id: GameModeId): GameExercise[] {
  return (content.value?.exercises ?? []).filter((exercise): exercise is GameExercise =>
    isGameExercise(exercise) && isGameModeCompatible(id, exercise.type),
  )
}

function isGameSetupAvailable(
  mode: GameModeId,
  preset: DurationPreset,
  level: QuickSetupDifficulty,
): boolean {
  const configuration = mapQuickSetupToGameConfiguration({ duration: preset, difficulty: level })
  const eligible = getEligibleExercises(
    getModeCompatibleExercises(mode),
    configuration.difficulty,
  )
  const count = configuration.duration.questionCount
  if (configuration.answerFormat === 'mixed') {
    const distribution = getMixedExerciseDistribution(eligible, count)
    return distribution.singleChoice > 0 &&
      distribution.typedAnswer > 0 &&
      distribution.singleChoice + distribution.typedAnswer === count
  }
  const compatible = configuration.answerFormat === 'selection'
    ? eligible.filter(isSingleChoiceExercise)
    : eligible.filter(isTypedAnswerExercise)
  return compatible.length >= count
}

function isGameSetupDurationAvailable(mode: GameModeId, preset: DurationPreset): boolean {
  return quickDifficultyOptions.some(({ id }) => isGameSetupAvailable(mode, preset, id))
}

function isModeAvailable(mode: GameModeId): boolean {
  return quickDurationOptions.some(({ id }) => isGameSetupDurationAvailable(mode, id))
}

function applyStudyDefaults() {
  if (experience.value !== 'study') return
  const levels: DifficultyFilter[] = ['intermediate', 'beginner', 'all', 'advanced']
  difficulty.value = levels.find((level) =>
    getEligibleExercises(flashcardExercises.value, level).length > 0,
  ) ?? 'all'

  const preferredDuration = DURATION_PRESETS.find(({ id }) =>
    id === 'medium' && isStudyDurationAvailable(10),
  )
    ?? DURATION_PRESETS.find(({ count }) => count === 5 && isStudyDurationAvailable(count))
    ?? DURATION_PRESETS.find(({ count }) => count === 20 && isStudyDurationAvailable(count))
  if (preferredDuration) {
    duration.value = preferredDuration.id
  } else {
    duration.value = 'custom'
    customCount.value = Math.max(1, Math.min(QUICK_PLAY_COUNT, availableCount.value))
  }
}

async function loadSelectedBank(initial = false) {
  const subject = selectedSubject.value
  const topic = selectedTopic.value
  if (!subject || !topic) {
    content.value = null
    loadingBank.value = false
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
    if (initial) applyStudyDefaults()
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
  const nextModeId = experience.value === 'play' ? modeId.value ?? undefined : undefined
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
  await loadSelectedBank(true)
  await syncRoute()
}

async function selectTopic(topic: ContentTopicReference) {
  if (topic.id === topicId.value) return
  topicId.value = topic.id
  await loadSelectedBank(true)
  await syncRoute()
}

async function selectMode(value: GameModeId) {
  if (!isModeAvailable(value)) return
  modeId.value = value
  setupStep.value = 2
  await syncRoute()
}

function selectGameDuration(value: DurationPreset) {
  const mode = modeId.value
  if (!mode || !isGameSetupDurationAvailable(mode, value)) return
  setupDuration.value = value
  setupStep.value = 3
}

function selectGameDifficulty(value: QuickSetupDifficulty) {
  const mode = modeId.value
  const preset = setupDuration.value
  if (!mode || !preset || !isGameSetupAvailable(mode, preset, value)) return
  setupDifficulty.value = value
}

function goToPreviousSetupStep() {
  if (setupStep.value === 3) setupStep.value = 2
  else if (setupStep.value === 2) setupStep.value = 1
}

function selectStudyDifficulty(value: DifficultyFilter) {
  if (!isStudyDifficultyAvailable(value)) return
  difficulty.value = value
}

function selectStudyDuration(value: DurationPreset | 'custom') {
  if (value === 'custom' || isStudyDurationAvailable(getPresetCount(value))) {
    duration.value = value
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
    modeId.value = GAME_MODES.find(({ id }) => id === route.params.modeId)?.id ?? null
    setupStep.value = 1
    setupDuration.value = null
    setupDifficulty.value = null
    autoAdvance.value = false
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
    if (experience.value === 'study') {
      const activityConfiguration: ActivityConfiguration = {
        duration: duration.value === 'custom'
          ? { kind: 'custom', questionCount: customCount.value }
          : { kind: 'preset', preset: duration.value, questionCount: getPresetCount(duration.value) },
        difficulty: difficulty.value,
      }
      startStudy(subject.id, topic.id, bank, activityConfiguration)
      await router.push({ name: 'study', params: { subjectId: subject.id, topicId: topic.id } })
    } else {
      const gameDuration = setupDuration.value
      const gameDifficulty = setupDifficulty.value
      if (!mode || !gameDuration || !gameDifficulty) return
      const configuration = mapQuickSetupToGameConfiguration({
        duration: gameDuration,
        difficulty: gameDifficulty,
      })
      startGame(subject.id, topic.id, bank, mode.id, configuration, { autoAdvance: autoAdvance.value })
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
  <section
    class="screen configuration-screen"
    aria-labelledby="configuration-title"
  >
    <RouterLink
      class="back-link"
      :to="{ name: 'home' }"
    >
      ← Volver a materias
    </RouterLink>

    <p
      v-if="loadingCatalog"
      class="loading-message"
      role="status"
    >
      Preparando...
    </p>
    <p
      v-else-if="error && !content"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-else-if="loadingBank"
      class="loading-message"
      role="status"
    >
      Cargando tema...
    </p>
    <template v-else-if="selectedSubject && selectedTopic && content">
      <header class="configuration-heading">
        <p class="eyebrow">
          {{ experience === 'study' ? 'Autoestudio' : selectedSubject.title }}
        </p>
        <h1 id="configuration-title">
          {{ experience === 'study' ? '¿Qué vas a estudiar?' : '¿Cómo jugamos?' }}
        </h1>
        <p class="configuration-topic">
          {{ selectedTopic.title }}
        </p>
      </header>

      <form
        class="setup-content"
        @submit.prevent="begin"
      >
        <section
          v-if="experience === 'study' && manifest && manifest.subjects.length > 1"
          class="configuration-section"
          aria-labelledby="study-subject-title"
        >
          <h2 id="study-subject-title">
            Materia
          </h2>
          <div class="setup-card-grid setup-card-grid--subjects">
            <button
              v-for="subject in manifest.subjects"
              :key="subject.id"
              class="configuration-card"
              :class="{ active: subjectId === subject.id }"
              type="button"
              :aria-pressed="subjectId === subject.id"
              :disabled="loadingBank"
              @click="selectSubject(subject)"
            >
              {{ subject.title }}
            </button>
          </div>
        </section>

        <section
          v-if="experience === 'study' && selectedSubject && selectedSubject.topics.length > 1"
          class="configuration-section"
          aria-labelledby="study-topic-title"
        >
          <h2 id="study-topic-title">
            Tema
          </h2>
          <div class="setup-card-grid">
            <button
              v-for="topic in selectedSubject.topics"
              :key="topic.id"
              class="configuration-card"
              :class="{ active: topicId === topic.id }"
              type="button"
              :aria-pressed="topicId === topic.id"
              :disabled="loadingBank"
              @click="selectTopic(topic)"
            >
              {{ topic.title }}
            </button>
          </div>
        </section>

        <template v-if="experience === 'play'">
          <section class="quick-setup-step">
            <div class="quick-setup-progress">
              <span>Paso {{ setupStep }} de 3</span>
              <div
                class="quick-setup-progress-track"
                role="progressbar"
                aria-label="Progreso de configuración"
                aria-valuemin="1"
                aria-valuemax="3"
                :aria-valuenow="setupStep"
              >
                <span :style="{ width: `${setupStep / 3 * 100}%` }"></span>
              </div>
            </div>

            <section
              v-if="setupStep === 1"
              class="configuration-section"
              aria-labelledby="mode-title"
            >
              <h2 id="mode-title">
                Elige una modalidad
              </h2>
              <div class="quick-setup-choices quick-setup-choices--modes">
                <button
                  v-for="mode in GAME_MODES"
                  :key="mode.id"
                  class="configuration-card quick-setup-choice quick-setup-mode"
                  :class="{ active: modeId === mode.id }"
                  type="button"
                  :aria-pressed="modeId === mode.id"
                  :disabled="loadingBank || !isModeAvailable(mode.id)"
                  @click="selectMode(mode.id)"
                >
                  <UniverseArtwork
                    v-if="mode.illustration === 'lightning'"
                    class="mode-art"
                    scene="lightning"
                  />
                  <TreasureArt
                    v-else
                    class="mode-art"
                    kind="closed-chest"
                  />
                  <strong>{{ mode.id === 'treasure' ? 'Tesoro' : 'Relámpago' }}</strong>
                  <small>{{ mode.id === 'treasure' ? 'Gana llaves y abre cofres.' : 'Suma puntos con tus aciertos.' }}</small>
                </button>
              </div>
            </section>

            <section
              v-else-if="setupStep === 2"
              class="configuration-section"
              aria-labelledby="duration-title"
            >
              <h2 id="duration-title">
                Elige la duración
              </h2>
              <div class="quick-setup-choices quick-setup-choices--durations">
                <button
                  v-for="preset in quickDurationOptions"
                  :key="preset.id"
                  class="configuration-card quick-setup-choice"
                  :class="{ active: setupDuration === preset.id }"
                  type="button"
                  :aria-pressed="setupDuration === preset.id"
                  :disabled="loadingBank || !modeId || !isGameSetupDurationAvailable(modeId, preset.id)"
                  @click="selectGameDuration(preset.id)"
                >
                  <strong>{{ preset.title }}</strong>
                </button>
              </div>
            </section>

            <section
              v-else
              class="configuration-section"
              aria-labelledby="difficulty-title"
            >
              <h2 id="difficulty-title">
                Elige la dificultad
              </h2>
              <div class="quick-setup-choices quick-setup-choices--difficulties">
                <button
                  v-for="level in quickDifficultyOptions"
                  :key="level.id"
                  class="configuration-card quick-setup-choice quick-setup-difficulty"
                  :class="{ active: setupDifficulty === level.id }"
                  type="button"
                  :aria-pressed="setupDifficulty === level.id"
                  :disabled="loadingBank || !modeId || !setupDuration || !isGameSetupAvailable(modeId, setupDuration, level.id)"
                  @click="selectGameDifficulty(level.id)"
                >
                  <strong>{{ level.title }}</strong>
                  <small>{{ level.description }}</small>
                </button>
              </div>
              <label class="auto-advance-setting">
                <span class="auto-advance-setting-copy">
                  <strong>Avance automático</strong>
                  <small>La partida avanza sola.</small>
                </span>
                <input
                  v-model="autoAdvance"
                  type="checkbox"
                  role="switch"
                  aria-label="Avanzar automáticamente"
                />
                <span
                  class="auto-advance-switch"
                  aria-hidden="true"
                ></span>
              </label>
            </section>
          </section>

          <button
            v-if="setupStep > 1"
            class="button secondary quick-setup-back"
            type="button"
            @click="goToPreviousSetupStep"
          >
            ← {{ setupStep === 2 ? 'Cambiar modalidad' : 'Cambiar duración' }}
          </button>

          <p
            v-if="wizardMessage"
            class="configuration-note"
            role="status"
          >
            {{ wizardMessage }}
          </p>

          <div
            v-if="setupStep === 3"
            class="configuration-action-bar"
          >
            <button
              class="button primary start-game"
              type="submit"
              :disabled="!canStart"
            >
              ¡JUGAR!
            </button>
          </div>
        </template>

        <template v-else>
          <section
            class="configuration-section"
            aria-labelledby="study-difficulty-title"
          >
            <h2 id="study-difficulty-title">
              Dificultad
            </h2>
            <div
              class="setup-card-grid setup-card-grid--four"
              role="group"
              aria-label="Elige la dificultad"
            >
              <button
                v-for="option in difficultyOptions"
                :key="option.id"
                class="configuration-card difficulty-choice"
                :class="{ active: difficulty === option.id }"
                type="button"
                :aria-pressed="difficulty === option.id"
                :disabled="loadingBank || !isStudyDifficultyAvailable(option.id)"
                @click="selectStudyDifficulty(option.id)"
              >
                <strong>{{ option.title }}</strong>
                <small>{{ option.description }}</small>
              </button>
            </div>
          </section>

          <section
            class="configuration-section"
            aria-labelledby="study-duration-title"
          >
            <h2 id="study-duration-title">
              Número de preguntas
            </h2>
            <div
              class="setup-card-grid setup-card-grid--three"
              role="group"
              aria-label="Elige cuántas tarjetas"
            >
              <button
                v-for="preset in DURATION_PRESETS"
                :key="preset.id"
                class="configuration-card duration-choice"
                :class="{ active: duration === preset.id }"
                type="button"
                :aria-pressed="duration === preset.id"
                :disabled="loadingBank || !isStudyDurationAvailable(preset.count)"
                @click="selectStudyDuration(preset.id)"
              >
                <strong>{{ preset.count }}</strong>
                <small>Preguntas</small>
              </button>
            </div>
          </section>

          <details class="advanced-options">
            <summary>
              Más opciones
            </summary>
            <div class="advanced-options-content">
              <button
                class="configuration-card custom-count-choice"
                :class="{ active: duration === 'custom' }"
                type="button"
                :aria-pressed="duration === 'custom'"
                @click="selectStudyDuration('custom')"
              >
                Cantidad personalizada
              </button>
              <label
                v-if="duration === 'custom'"
                class="field-label"
                for="custom-count"
              >
                Número de {{ activityNoun }}
              </label>
              <input
                v-if="duration === 'custom'"
                id="custom-count"
                v-model.number="customCount"
                class="select-control"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
              >
            </div>
          </details>

          <p
            v-if="configurationMessage"
            class="configuration-note"
            role="status"
          >
            {{ configurationMessage }}
          </p>

          <div class="configuration-action-bar">
            <button
              class="button primary start-game"
              type="submit"
              :disabled="!canStart"
            >
              ¡ESTUDIAR!
            </button>
          </div>
        </template>

        <p
          v-if="startError"
          class="error"
          role="alert"
        >
          {{ startError }}
        </p>
      </form>
    </template>
    <p
      v-else-if="!selectedSubject?.topics.length"
      class="empty-message"
    >
      Todavía no hay temas disponibles.
    </p>
  </section>
</template>
