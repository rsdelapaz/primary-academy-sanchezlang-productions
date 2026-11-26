<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { ContentSubject } from '../domain/content'
import SubjectGlyph from '../components/SubjectGlyph.vue'
import { useThemePreference, type ThemeId } from '../presentation/theme-preference'
import { useCatalog } from '../presentation/catalog'

const { activeTheme } = useThemePreference()
const { manifest, loading, error, loadManifest } = useCatalog()
const mobileViewport = ref(
  typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(max-width: 759px)').matches,
)
let mobileViewportQuery: ReturnType<typeof globalThis.matchMedia> | undefined
const handleViewportChange = () => {
  mobileViewport.value = mobileViewportQuery?.matches ?? false
}

const artworkFiles: Record<ThemeId, { desktop: string; mobile: string }> = {
  'pop-adventure': {
    desktop: 'pop-adventure-hero-desktop.webp',
    mobile: 'pop-adventure-hero-mobile.webp',
  },
  galaxy: {
    desktop: 'galaxy-hero-desktop.webp',
    mobile: 'galaxy-hero-mobile.webp',
  },
}

const subjects = computed(() => manifest.value?.subjects ?? [])
const artwork = computed(() => {
  const files = artworkFiles[activeTheme.value]
  const base = import.meta.env.BASE_URL
  return {
    desktop: `${base}art/${files.desktop}`,
    mobile: `${base}art/${files.mobile}`,
  }
})
const activeArtwork = computed(() =>
  mobileViewport.value ? artwork.value.mobile : artwork.value.desktop,
)

onMounted(() => {
  mobileViewportQuery = globalThis.matchMedia('(max-width: 759px)')
  mobileViewport.value = mobileViewportQuery.matches
  mobileViewportQuery.addEventListener('change', handleViewportChange)
  void loadManifest()
})

onUnmounted(() => {
  mobileViewportQuery?.removeEventListener('change', handleViewportChange)
})

function subjectTarget(subject: ContentSubject) {
  if (subject.topics.length === 1) {
    return {
      name: 'choose-challenge',
      params: { subjectId: subject.id, topicId: subject.topics[0].id },
    }
  }
  return { name: 'subject', params: { subjectId: subject.id } }
}
</script>

<template>
  <section
    class="home-screen"
    aria-labelledby="home-title"
  >
    <div class="home-stage">
      <picture
        class="home-artwork"
        aria-hidden="true"
      >
        <source
          type="image/webp"
          media="(max-width: 759px)"
          :srcset="artwork.mobile"
        >
        <source
          type="image/webp"
          media="(min-width: 760px)"
          :srcset="artwork.desktop"
        >
        <img
          :src="activeArtwork"
          alt=""
          width="1600"
          height="900"
          fetchpriority="high"
          decoding="async"
        >
      </picture>

      <div class="home-stage-shade"></div>
      <div class="home-menu">
        <header class="home-menu-heading">
          <p class="eyebrow">
            Centro de misiones
          </p>
          <h1 id="home-title">
            ¿A qué jugamos?
          </h1>
        </header>

        <nav
          v-if="subjects.length"
          class="home-subject-grid"
          aria-label="Elige una materia"
        >
          <RouterLink
            v-for="(subject, index) in subjects"
            :key="subject.id"
            class="home-subject"
            :class="`home-subject--${subject.id}`"
            :to="subjectTarget(subject)"
          >
            <span class="home-subject-mark">
              <SubjectGlyph :subject-id="subject.id" />
              <span class="home-subject-index">0{{ index + 1 }}</span>
            </span>
            <span class="home-subject-copy">
              <strong>{{ subject.title }}</strong>
              <span>Elegir reto <span aria-hidden="true">→</span></span>
            </span>
          </RouterLink>
        </nav>
        <p
          v-else-if="loading"
          class="home-status"
          role="status"
        >
          Cargando misiones...
        </p>
        <p
          v-else-if="error"
          class="home-status home-status--error"
          role="alert"
        >
          {{ error }}
        </p>
        <p
          v-else
          class="home-status"
        >
          No hay misiones disponibles.
        </p>

        <RouterLink
          class="home-study-link"
          :to="{ name: 'choose-challenge', query: { experience: 'study' } }"
        >
          <span
            class="home-study-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              focusable="false"
            >
              <path d="M4 5.5c2.8-.9 5.5-.5 8 1.2v12c-2.5-1.7-5.2-2.1-8-1.2zM20 5.5c-2.8-.9-5.5-.5-8 1.2v12c2.5-1.7 5.2-2.1 8-1.2z" />
            </svg>
          </span>
          <span>
            <strong>Autoestudio</strong>
            <small>Tarjetas de memoria</small>
          </span>
          <span
            class="home-study-arrow"
            aria-hidden="true"
          >→</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>
