<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import GameFeelLayer from './components/GameFeelLayer.vue'
import SoundToggle from './components/SoundToggle.vue'
import ThemeSelector from './components/ThemeSelector.vue'
import { useThemePreference } from './presentation/theme-preference'

const { activeTheme, themes } = useThemePreference()
const currentTheme = computed(() => themes.find((theme) => theme.id === activeTheme.value) ?? themes[0])
</script>

<template>
  <div class="app-shell" :data-theme="activeTheme">
    <header class="topbar">
      <RouterLink
        class="brand"
        to="/"
        aria-label="Ir al inicio"
      >
        <span
          class="brand-mark"
          aria-hidden="true"
        >R</span>
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
    <GameFeelLayer />
    <span class="sr-only" aria-live="polite">{{ currentTheme.name }}</span>
  </div>
</template>
