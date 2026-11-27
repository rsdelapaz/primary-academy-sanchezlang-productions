<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemePreference } from '../presentation/theme-preference'
import type { TreasureId } from '../domain/treasure'

type ArtKind = TreasureId | 'closed-chest' | 'open-chest' | 'key'

const props = defineProps<{
  kind: ArtKind
  label?: string
}>()
const { activeTheme, focusMode } = useThemePreference()
const failed = ref(false)
const imageUrl = computed(() => props.kind !== 'key' && !focusMode.value
  ? `${import.meta.env.BASE_URL}art/treasures/${activeTheme.value}-${props.kind}.webp` : '')
watch(imageUrl, () => { failed.value = false })
</script>

<template>
  <img
    v-if="imageUrl && !failed"
    class="treasure-art treasure-raster"
    :src="imageUrl"
    :alt="label ?? ''"
    :aria-hidden="label ? undefined : 'true'"
    width="448"
    height="448"
    decoding="async"
    @error="failed = true"
  >
  <svg
    v-else-if="kind === 'key'"
    class="treasure-art"
    viewBox="0 0 64 32"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <circle
      cx="14"
      cy="16"
      r="9"
      fill="none"
      stroke="var(--treasure-gold)"
      stroke-width="5"
    />
    <path
      d="M22 16h34m-8 0v7m-8-7v5"
      fill="none"
      stroke="var(--treasure-gold)"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="5"
    />
    <path
      d="M14 5v4m0 14v4"
      stroke="var(--treasure-gold-light)"
      stroke-linecap="round"
      stroke-width="2"
    />
  </svg>
  <svg
    v-else
    class="treasure-art"
    viewBox="0 0 100 80"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <template v-if="kind === 'closed-chest'">
      <path
        d="M13 31 21 12h58l8 19z"
        fill="var(--treasure-wood-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M11 31h78v37H11z"
        fill="var(--treasure-wood)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M23 32v35m54-35v35M10 43h80"
        fill="none"
        stroke="var(--treasure-gold)"
        stroke-width="6"
      />
      <path
        d="M42 42h16v16H42z"
        fill="var(--treasure-gold-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="3"
      />
      <circle
        cx="50"
        cy="50"
        r="2"
        fill="var(--treasure-wood)"
      />
      <path
        d="M7 68h86"
        stroke="var(--treasure-gold-dark)"
        stroke-linecap="round"
        stroke-width="5"
      />
    </template>
    <template v-else-if="kind === 'open-chest'">
      <path
        d="m18 28 7-20h57l8 20-12 8H29z"
        fill="var(--treasure-wood-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M29 32h42l13 11H16z"
        fill="var(--treasure-wood)"
        stroke="var(--treasure-gold)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M11 43h78v26H11z"
        fill="var(--treasure-wood)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M22 44v24m56-24v24M10 54h80"
        fill="none"
        stroke="var(--treasure-gold)"
        stroke-width="6"
      />
      <path
        d="M43 52h14v14H43z"
        fill="var(--treasure-gold-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="3"
      />
    </template>
    <template v-else-if="kind === 'star-crystal'">
      <path
        d="m50 6 11 25 27 3-20 18 6 26-24-14-24 14 6-26L12 34l27-3z"
        fill="var(--treasure-crystal)"
        stroke="var(--treasure-crystal-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="m50 17 7 19 18 2-14 12 4 17-15-9z"
        fill="var(--treasure-crystal-light)"
      />
      <path
        d="m50 17-7 19-18 2 14 12-4 17 15-9z"
        fill="var(--treasure-crystal)"
      />
    </template>
    <template v-else-if="kind === 'golden-compass'">
      <circle
        cx="50"
        cy="40"
        r="34"
        fill="var(--treasure-gold)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="5"
      />
      <circle
        cx="50"
        cy="40"
        r="26"
        fill="var(--treasure-compass-blue)"
        stroke="var(--treasure-gold-light)"
        stroke-width="3"
      />
      <path
        d="m59 20-6 24-23 16 7-25z"
        fill="var(--treasure-gold-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="2"
      />
      <path
        d="m41 60 6-24 23-16-7 25z"
        fill="var(--treasure-crystal)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="2"
      />
      <circle
        cx="50"
        cy="40"
        r="4"
        fill="var(--treasure-gold-light)"
      />
    </template>
    <template v-else>
      <path
        d="m12 53-4-34 21 17L50 8l21 28 21-17-4 34z"
        fill="var(--treasure-gold)"
        stroke="var(--treasure-gold-dark)"
        stroke-linejoin="round"
        stroke-width="4"
      />
      <path
        d="M14 54h72v12H14z"
        fill="var(--treasure-gold-light)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="3"
      />
      <circle
        cx="50"
        cy="18"
        r="6"
        fill="var(--treasure-crystal)"
        stroke="var(--treasure-crystal-dark)"
        stroke-width="2"
      />
      <circle
        cx="29"
        cy="38"
        r="5"
        fill="var(--treasure-crystal-purple)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="2"
      />
      <circle
        cx="71"
        cy="38"
        r="5"
        fill="var(--treasure-crystal)"
        stroke="var(--treasure-gold-dark)"
        stroke-width="2"
      />
    </template>
  </svg>
</template>
