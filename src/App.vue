<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import CreditsDialog from './components/CreditsDialog.vue'
import EpicBackdrop from './components/EpicBackdrop.vue'
import galaxyBrand from './assets/epic/galaxy-brand.svg'
import popBrand from './assets/epic/pop-brand.svg'
import GameFeelLayer from './components/GameFeelLayer.vue'
import SoundToggle from './components/SoundToggle.vue'
import ThemeSelector from './components/ThemeSelector.vue'
import { useThemePreference } from './presentation/theme-preference'

const { activeTheme, themes, focusMode } = useThemePreference()
const currentTheme = computed(() => themes.find((theme) => theme.id === activeTheme.value) ?? themes[0])
const route = useRoute()
const activeScene = computed(() => route.name === 'home' ? 'hero' : route.name === 'play' ? 'game' : route.name === 'results' ? 'victory' : route.name === 'choose-challenge' && route.query.experience !== 'study' ? 'setup' : null)
const isStudy = computed(() => route.name === 'study' || (route.name === 'choose-challenge' && route.query.experience === 'study'))
const currentYear = new Date().getFullYear()
const creditsDialog = ref<InstanceType<typeof CreditsDialog> | null>(null)
const copyrightDate = `${currentYear}-01-01`

const brandLogoUrl = computed(() => (activeScene.value || isStudy.value) && !focusMode.value
  ? activeTheme.value === 'galaxy' ? galaxyBrand : popBrand
  : `${import.meta.env.BASE_URL}brand/retonautas-logo.svg`)
</script>

<template>
  <div
    class="app-shell"
    :data-theme="activeTheme"
    :data-focus="focusMode"
    :class="{ 'is-immersive': activeScene && !focusMode, 'is-victory': activeScene === 'victory', 'is-play': activeScene === 'game', 'is-setup': activeScene === 'setup', 'is-home': activeScene === 'hero' }"
  >
    <EpicBackdrop
      v-if="activeScene && !focusMode"
      :scene="activeScene"
      :theme="activeTheme"
    />
    <header class="topbar">
      <RouterLink
        class="brand"
        to="/"
        aria-label="Ir al inicio"
      >
        <img
          class="brand-logo"
          :src="brandLogoUrl"
          alt=""
          aria-hidden="true"
          width="40"
          height="40"
        />
        <span>RetoNautas</span>
      </RouterLink>
      <div class="topbar-controls">
        <SoundToggle />
        <ThemeSelector />
      </div>
    </header>
    <main>
      <RouterView />
    </main>
    <footer class="app-footer">
      <p>© <time :datetime="copyrightDate">{{ currentYear }}</time> Sánchez Lang Productions</p>
      <button
        type="button"
        class="credits-button"
        aria-haspopup="dialog"
        @click="creditsDialog?.show()"
      >
        Créditos
      </button>
    </footer>
    <CreditsDialog
      ref="creditsDialog"
      :year="currentYear"
    />
    <GameFeelLayer />
    <span
      class="sr-only"
      aria-live="polite"
    >{{ currentTheme.name }}</span>
  </div>
</template>
