<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, RouterLink, useRoute, useRouter } from 'vue-router'
import WizardChoiceCard from '../components/WizardChoiceCard.vue'
import WizardGlyph from '../components/WizardGlyph.vue'
import { getModeCardPresentation } from '../presentation/mode-card'
import { createAutoAdvance, type AutoAdvanceState } from '../presentation/auto-advance'
import { useThemePreference } from '../presentation/theme-preference'
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
const { activeTheme, focusMode } = useThemePreference()
const baseUrl = import.meta.env.BASE_URL
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
let startSequence = 0
const starting = ref(false)
const startButton = ref<InstanceType<typeof globalThis.HTMLButtonElement> | null>(null)
const stepHeading = ref<InstanceType<typeof globalThis.HTMLHeadingElement> | null>(null)
const startCountdown = shallowRef<AutoAdvanceState>({
  status: 'idle', feedbackKey: null, remainingMs: 0, remainingSeconds: 0,
})
const countdownRunning = computed(() => startCountdown.value.status === 'running')
const startController = createAutoAdvance({
  onTick: (state) => { startCountdown.value = state },
  onAdvance: () => {
    if (globalThis.document.visibilityState === 'visible' && route.name === 'choose-challenge' && canStart.value) void begin()
  },
})
const setupSteps = ['Modalidad', 'Duración', 'Dificultad'] as const
const modeCards = computed(() => GAME_MODES.map((mode) => ({
  id: mode.id,
  ...getModeCardPresentation(mode, activeTheme.value),
})))

function cancelAutoStart() {
  startController.cancel()
}

function cancelAndFocusPlay() {
  cancelAutoStart()
  void nextTick(() => startButton.value?.focus({ preventScroll: true }))
}

function handleVisibility() {
  if (globalThis.document.visibilityState !== 'visible') cancelAutoStart()
}

function handleSetupKey(event: InstanceType<typeof globalThis.KeyboardEvent>) {
  if (countdownRunning.value && (event.key === 'Escape' || event.key === 'Tab')) {
    if (event.key === 'Escape') cancelAndFocusPlay()
    else cancelAutoStart()
  }
}

function handleChromeInteraction(event: InstanceType<typeof globalThis.PointerEvent>) {
  if (countdownRunning.value && event.target instanceof globalThis.Element && event.target.closest('.topbar')) cancelAutoStart()
}

const difficultyOptions: { id: DifficultyFilter; title: string; description: string }[] = [
  { id: 'beginner', title: 'Fácil', description: 'Para entrar en ritmo.' },
  { id: 'intermediate', title: 'Normal', description: 'Un reto equilibrado.' },
  { id: 'advanced', title: 'Difícil', description: 'Para poner a prueba tus ideas.' },
  { id: 'all', title: 'Variada', description: 'Preguntas de varios niveles.' },
]
const quickDurationOptions: { id: DurationPreset; title: string; description: string; level: number }[] = [
  { id: 'short', title: 'Corta', description: 'Una partida rápida.', level: 1 },
  { id: 'medium', title: 'Media', description: 'Una buena aventura.', level: 2 },
  { id: 'long', title: 'Larga', description: 'Una misión completa.', level: 3 },
]
const quickDifficultyOptions: {
  id: QuickSetupDifficulty
  title: string
  description: string
  level: number
}[] = [
  { id: 'easy', title: 'Fácil', description: 'Para empezar.', level: 1 },
  { id: 'medium', title: 'Media', description: 'Reto medio.', level: 2 },
  { id: 'hard', title: 'Difícil', description: 'Para expertos.', level: 3 },
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
      return 'No hay suficientes preguntas para esta modalidad. Vuelve atrás y elige otra modalidad.'
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
  cancelAutoStart()
  modeId.value = value
  if (setupDuration.value && !isGameSetupDurationAvailable(value, setupDuration.value)) {
    setupDuration.value = null
    setupDifficulty.value = null
  } else if (setupDuration.value && setupDifficulty.value &&
    !isGameSetupAvailable(value, setupDuration.value, setupDifficulty.value)) {
    setupDifficulty.value = null
  }
  setupStep.value = 2
  await syncRoute()
}

function selectGameDuration(value: DurationPreset) {
  const mode = modeId.value
  if (!mode || !isGameSetupDurationAvailable(mode, value)) return
  cancelAutoStart()
  setupDuration.value = value
  if (setupDifficulty.value && !isGameSetupAvailable(mode, value, setupDifficulty.value)) setupDifficulty.value = null
  setupStep.value = 3
}

function selectGameDifficulty(value: QuickSetupDifficulty) {
  const mode = modeId.value
  const preset = setupDuration.value
  if (!mode || !preset || !isGameSetupAvailable(mode, preset, value)) return
  setupDifficulty.value = value
  if (!starting.value && canStart.value && globalThis.document.visibilityState === 'visible') {
    // Only an explicit difficulty selection arms the timer. Going back,
    // restoring choices or changing theme must never start a session.
    startController.update({
      feedbackKey: `setup:${++startSequence}`,
      enabled: true,
      blocked: false,
      delayMs: 5000,
    })
  }
}

function goToPreviousSetupStep() {
  cancelAutoStart()
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
  if (starting.value || !canStart.value || !subject || !topic || !bank) return
  cancelAutoStart()
  starting.value = true
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
  } finally {
    starting.value = false
  }
}

watch(setupStep, () => {
  cancelAutoStart()
  void nextTick(() => {
    globalThis.scrollTo({ top: 0, behavior: 'auto' })
    stepHeading.value?.focus({ preventScroll: true })
  })
})
watch([activeTheme, focusMode, autoAdvance, () => route.fullPath], cancelAutoStart)
watch(canStart, (available) => { if (!available) cancelAutoStart() })
onBeforeRouteLeave(() => { cancelAutoStart() })
onMounted(() => {
  globalThis.document.addEventListener('visibilitychange', handleVisibility)
  globalThis.document.addEventListener('keydown', handleSetupKey)
  globalThis.document.addEventListener('pointerdown', handleChromeInteraction)
  void initialize()
})
onBeforeUnmount(() => {
  startController.dispose()
  globalThis.document.removeEventListener('visibilitychange', handleVisibility)
  globalThis.document.removeEventListener('keydown', handleSetupKey)
  globalThis.document.removeEventListener('pointerdown', handleChromeInteraction)
})
</script>

<template>
  <section
    class="screen configuration-screen"
    :class="{ 'wizard-screen': experience === 'play', 'wizard-final-step': experience === 'play' && setupStep === 3 }"
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
        <p
          v-if="experience === 'study'"
          class="eyebrow"
        >
          Autoestudio
        </p>
        <h1 id="configuration-title">
          {{ experience === 'study' ? '¿Qué vas a estudiar?' : '¿Cómo jugamos?' }}
        </h1>
        <p class="configuration-topic">
          {{ experience === 'play' ? selectedSubject.title + ' · ' : '' }}{{ selectedTopic.title }}
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
            <ol
              class="wizard-stepper"
              aria-label="Progreso de configuración"
            >
              <li
                v-for="(label, index) in setupSteps"
                :key="label"
                :class="{ current: setupStep === index + 1, completed: setupStep > index + 1 }"
                :aria-current="setupStep === index + 1 ? 'step' : undefined"
              >
                <span class="wizard-step-number">{{ setupStep > index + 1 ? '✓' : index + 1 }}</span>
                <span>{{ label }}</span>
              </li>
            </ol>

            <section
              class="wizard-panel"
              :aria-labelledby="`wizard-step-title-${setupStep}`"
            >
              <span
                class="game-frame-crest game-frame-crest--top"
                aria-hidden="true"
              ></span>
              <span
                class="game-frame-crest game-frame-crest--bottom"
                aria-hidden="true"
              ></span>
              <h2
                :id="`wizard-step-title-${setupStep}`"
                ref="stepHeading"
                tabindex="-1"
              >
                {{ setupStep === 1 ? 'Elige una modalidad' : setupStep === 2 ? 'Elige la duración' : 'Elige la dificultad' }}
              </h2>

              <div
                v-if="setupStep === 1"
                class="quick-setup-choices wizard-mode-grid"
              >
                <WizardChoiceCard
                  v-for="mode in modeCards"
                  :key="mode.id"
                  class="wizard-mode-card"
                  :title="mode.title"
                  :description="mode.description"
                  :selected="modeId === mode.id"
                  :disabled="loadingBank || !isModeAvailable(mode.id)"
                  @select="selectMode(mode.id)"
                >
                  <template #art>
                    <img
                      v-if="!focusMode && mode.artwork"
                      :src="baseUrl + mode.artwork"
                      class="wizard-mode-art"
                      alt=""
                      width="500"
                      height="277"
                      decoding="async"
                      loading="lazy"
                    >
                    <WizardGlyph
                      v-else-if="!focusMode"
                      kind="mode"
                    />
                  </template>
                </WizardChoiceCard>
              </div>

              <div
                v-else-if="setupStep === 2"
                class="quick-setup-choices wizard-level-grid"
              >
                <WizardChoiceCard
                  v-for="preset in quickDurationOptions"
                  :key="preset.id"
                  :title="preset.title"
                  :description="preset.description"
                  :selected="setupDuration === preset.id"
                  :disabled="loadingBank || !modeId || !isGameSetupDurationAvailable(modeId, preset.id)"
                  @select="selectGameDuration(preset.id)"
                >
                  <template #art>
                    <WizardGlyph
                      v-if="!focusMode"
                      kind="duration"
                      :level="preset.level"
                    />
                  </template>
                </WizardChoiceCard>
              </div>

              <template v-else>
                <div class="quick-setup-choices wizard-level-grid">
                  <WizardChoiceCard
                    v-for="level in quickDifficultyOptions"
                    :key="level.id"
                    :title="level.title"
                    :description="level.description"
                    :selected="setupDifficulty === level.id"
                    :disabled="starting || loadingBank || !modeId || !setupDuration || !isGameSetupAvailable(modeId, setupDuration, level.id)"
                    @select="selectGameDifficulty(level.id)"
                  >
                    <template #art>
                      <WizardGlyph
                        v-if="!focusMode"
                        kind="difficulty"
                        :level="level.level"
                      />
                    </template>
                  </WizardChoiceCard>
                </div>
                <label class="auto-advance-setting">
                  <span class="auto-advance-setting-copy">
                    <strong>Avance automático</strong>
                    <small>Pasa a la siguiente pregunta automáticamente.</small>
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
              </template>
              <button
                v-if="setupStep > 1"
                class="button secondary quick-setup-back"
                type="button"
                @click="goToPreviousSetupStep"
              >
                ← {{ setupStep === 2 ? 'Cambiar modalidad' : 'Cambiar duración' }}
              </button>
            </section>
          </section>

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
            <div class="wizard-start-controls">
              <div
                v-if="countdownRunning"
                class="wizard-countdown"
              >
                <span role="status">Comienza en <strong>{{ startCountdown.remainingSeconds }} s</strong></span>
                <button
                  class="button secondary wizard-cancel-start"
                  type="button"
                  @click="cancelAndFocusPlay"
                >
                  Detener
                </button>
              </div>
              <button
                ref="startButton"
                class="button primary start-game"
                type="submit"
                :disabled="!canStart || starting"
              >
                {{ starting ? 'Preparando...' : '¡JUGAR!' }}
              </button>
            </div>
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
