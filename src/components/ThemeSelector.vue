<script setup lang="ts">
import { ref } from 'vue'
import { useThemePreference, type ThemeId } from '../presentation/theme-preference'

const menu = ref<{ open: boolean } | null>(null)
const error = ref('')
const { activeTheme, themes, selectTheme } = useThemePreference()

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
      <span
        class="theme-trigger-art"
        :class="`theme-art-${activeTheme}`"
        aria-hidden="true"
      >
        <i
          v-for="color in themes.find((theme) => theme.id === activeTheme)?.swatches.slice(1, 4)"
          :key="color"
          :style="{ backgroundColor: color }"
        ></i>
      </span>
      <span>Tema</span>
      <span class="theme-trigger-name">{{ themes.find((theme) => theme.id === activeTheme)?.name }}</span>
    </summary>
    <div class="theme-panel">
      <p class="theme-panel-title">
        Elige tu aventura visual
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
        <span
          class="theme-choice-art"
          :class="`theme-art-${theme.id}`"
          aria-hidden="true"
        >
          <i
            v-for="color in theme.swatches.slice(1, 4)"
            :key="color"
            :style="{ backgroundColor: color }"
          ></i>
        </span>
        <span class="theme-choice-copy">
          <strong>{{ theme.name }}</strong>
          <small>{{ theme.description }}</small>
          <small class="theme-motifs">{{ theme.motifs.join(' · ') }}</small>
          <span
            class="theme-swatches"
            aria-hidden="true"
          >
            <i
              v-for="color in theme.swatches"
              :key="color"
              :style="{ backgroundColor: color }"
            ></i>
          </span>
        </span>
        <span
          v-if="activeTheme === theme.id"
          class="theme-active-label"
        >✓ Activo</span>
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
