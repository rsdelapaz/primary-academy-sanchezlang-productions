<script setup lang="ts">
import { ref } from 'vue'
import { useThemePreference, type ThemeId } from '../presentation/theme-preference'

const menu = ref<{ open: boolean } | null>(null)
const error = ref('')
const { activeTheme, themes, selectTheme, focusMode, setFocusMode } = useThemePreference()

function themeIconUrl(themeId: ThemeId): string {
  return `${import.meta.env.BASE_URL}brand/theme-${themeId}.svg`
}

async function chooseTheme(themeId: ThemeId) {
  error.value = ''
  try {
    await selectTheme(themeId)
    if (menu.value) menu.value.open = false
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No se pudo cambiar el tema.'
  }
}
</script>

<template>
  <details
    ref="menu"
    class="theme-selector"
  >
    <summary
      class="theme-trigger"
      aria-label="Cambiar tema visual"
    >
      <img
        class="theme-trigger-art"
        :src="themeIconUrl(activeTheme)"
        alt=""
        width="30"
        height="30"
      >
      <span>{{ focusMode ? 'Focus ·' : 'Mundo' }}</span>
      <span class="theme-trigger-name">{{ themes.find((theme) => theme.id === activeTheme)?.name }}</span>
    </summary>
    <div class="theme-panel">
      <p class="theme-panel-title">
        Elige tu mundo
      </p>
      <button
        v-for="theme in themes"
        :key="theme.id"
        class="theme-choice"
        :class="{ active: activeTheme === theme.id }"
        type="button"
        :aria-pressed="activeTheme === theme.id"
        :aria-label="`Usar tema ${theme.name}`"
        @click="chooseTheme(theme.id)"
      >
        <img
          class="theme-choice-art"
          :src="themeIconUrl(theme.id)"
          alt=""
          width="56"
          height="56"
        >
        <span class="theme-choice-copy">
          <strong>{{ theme.name }}</strong>
          <small>{{ theme.description }}</small>
        </span>
        <span
          v-if="activeTheme === theme.id"
          class="theme-active-label"
        >✓ Activo</span>
      </button>
      <button
        class="focus-mode-choice"
        type="button"
        role="switch"
        :aria-checked="focusMode"
        aria-label="Modo Focus"
        @click="setFocusMode(!focusMode)"
      >
        <span><strong>Modo Focus</strong><small>Sin escenarios ni efectos decorativos.</small></span>
        <span
          class="focus-mode-switch"
          :class="{ enabled: focusMode }"
          aria-hidden="true"
        ></span>
      </button>
      <p
        v-if="error"
        class="theme-error"
        role="alert"
      >
        {{ error }}
      </p>
    </div>
  </details>
</template>
