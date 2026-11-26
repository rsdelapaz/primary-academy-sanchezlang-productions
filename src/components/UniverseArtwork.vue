<script setup lang="ts">
import { computed } from 'vue'
import { THEMES, useThemePreference, type ThemeId } from '../presentation/theme-preference'

type ArtworkScene = 'hero' | 'tile' | 'preview' | 'study' | 'lightning'

const props = withDefaults(defineProps<{
  scene?: ArtworkScene
  themeId?: ThemeId | null
  variation?: number
}>(), {
  scene: 'hero',
  themeId: null,
  variation: 0,
})

const { activeTheme } = useThemePreference()
const selectedTheme = computed(() => props.themeId ?? activeTheme.value)
const selectedArtwork = computed(() => THEMES.find(({ id }) => id === selectedTheme.value)?.artwork)
const variationClass = computed(() => `variation-${Math.abs(props.variation) % 3}`)
</script>

<template>
  <svg
    class="universe-art"
    :class="[`scene-${scene}`, `theme-${selectedTheme}`, variationClass]"
    viewBox="0 0 640 420"
    aria-hidden="true"
    focusable="false"
  >
    <g v-if="selectedArtwork === 'magic-island'">
      <template v-if="scene === 'hero' || scene === 'preview'">
        <circle
          class="art-star"
          cx="105"
          cy="94"
          r="8"
        />
        <path
          class="art-star"
          d="m219 54 7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z"
        />
        <circle
          class="art-orb"
          cx="500"
          cy="94"
          r="38"
        />
        <path
          class="art-island"
          d="M42 282c42-40 93-57 155-37 57-39 125-38 179-4 64-33 150-19 220 34-28 62-86 94-173 98H193C109 369 60 339 42 282Z"
        />
        <path
          class="art-water"
          d="m192 339 22 70h24l-7-72m116 14 2 56h24l12-64m76 40 10 21h22l-5-42"
        />
        <path
          class="art-land"
          d="M47 281c44-40 95-55 151-36 58-38 125-37 178-5 63-31 147-18 214 36-20 27-48 46-83 58H137c-44-13-72-31-90-53Z"
        />
        <path
          class="art-crystal"
          d="m124 269 24-62 24 62-24 34z"
        />
        <path
          class="art-crystal-light"
          d="m148 207 24 62-24 34z"
        />
        <path
          class="art-crystal"
          d="m478 263 18-47 19 47-19 28z"
        />
        <g
          class="art-mascot"
          transform="translate(270 128)"
        >
          <path d="m19 39-12-29 29 14c14-7 35-6 49 2l26-17-5 35c10 14 12 35 7 51-8 26-31 43-59 43s-52-17-59-43c-5-19 1-42 24-56Z" />
          <path
            class="art-mascot-face"
            d="M23 67c9-8 18-8 27 0m18 0c9-8 18-8 27 0"
          />
          <circle
            class="art-mascot-eye"
            cx="40"
            cy="75"
            r="4"
          />
          <circle
            class="art-mascot-eye"
            cx="77"
            cy="75"
            r="4"
          />
          <path
            class="art-mascot-face"
            d="M51 92q8 8 16 0"
          />
          <path
            class="art-mascot-accent"
            d="m58 29 7 12 14 2-10 9 2 14-13-7-12 7 2-14-10-9 14-2z"
          />
        </g>
      </template>
      <template v-else-if="scene === 'tile'">
        <circle
          class="art-orb"
          cx="320"
          cy="210"
          r="112"
        />
        <path
          class="art-crystal"
          d="m320 80 67 95-67 150-67-150z"
        />
        <path
          class="art-crystal-light"
          d="m320 80 67 95-67 28z"
        />
        <path
          class="art-star"
          d="m170 112 8 16 18 2-13 12 3 18-16-9-16 9 3-18-13-12 18-2z"
        />
        <circle
          class="art-star"
          cx="466"
          cy="294"
          r="9"
        />
      </template>
      <template v-else-if="scene === 'study'">
        <path
          class="art-book"
          d="M127 108h152c23 0 41 18 41 40v168H168c-23 0-41-18-41-41z"
        />
        <path
          class="art-book"
          d="M513 108H361c-23 0-41 18-41 40v168h152c23 0 41-18 41-41z"
        />
        <path
          class="art-book-line"
          d="M178 157h87m-87 34h70m127-34h87m-87 34h70"
        />
        <path
          class="art-star"
          d="m320 180 13 27 30 4-22 21 5 30-26-14-27 14 5-30-22-21 30-4z"
        />
      </template>
      <template v-else>
        <path
          class="art-bolt"
          d="m361 54-147 192h93l-28 120 165-214h-96z"
        />
        <path
          class="art-star"
          d="m164 107 9 18 20 3-15 14 4 20-18-10-18 10 4-20-15-14 20-3z"
        />
        <circle
          class="art-orb"
          cx="472"
          cy="315"
          r="28"
        />
      </template>
    </g>

    <g v-else>
      <template v-if="scene === 'hero' || scene === 'preview'">
        <circle
          class="art-star"
          cx="98"
          cy="79"
          r="5"
        />
        <circle
          class="art-star"
          cx="198"
          cy="96"
          r="7"
        />
        <circle
          class="art-star"
          cx="556"
          cy="272"
          r="6"
        />
        <ellipse
          class="art-orbit"
          cx="449"
          cy="180"
          rx="151"
          ry="48"
          transform="rotate(-22 449 180)"
        />
        <circle
          class="art-planet"
          cx="448"
          cy="168"
          r="78"
        />
        <path
          class="art-planet-band"
          d="M380 204c45 27 97 24 137-9-13 32-37 51-68 51-31 0-56-16-69-42Z"
        />
        <g
          class="art-robot"
          transform="translate(145 177)"
        >
          <path d="M70 5v-23m-13 0h26" />
          <circle
            class="art-robot-light"
            cx="70"
            cy="-24"
            r="7"
          />
          <rect
            x="17"
            y="12"
            width="106"
            height="91"
            rx="25"
          />
          <rect
            class="art-robot-screen"
            x="30"
            y="28"
            width="80"
            height="45"
            rx="15"
          />
          <circle
            class="art-robot-eye"
            cx="53"
            cy="50"
            r="5"
          />
          <circle
            class="art-robot-eye"
            cx="86"
            cy="50"
            r="5"
          />
          <path
            class="art-robot-face"
            d="M53 62q17 13 34 0"
          />
          <path d="M39 106v24m63-24v24" />
          <path
            class="art-robot-light"
            d="m41 81-13 16m82-16 13 16"
          />
        </g>
        <path
          class="art-orbit"
          d="M83 325c118-56 343-54 480 5"
        />
      </template>
      <template v-else-if="scene === 'tile'">
        <circle
          class="art-planet"
          cx="320"
          cy="210"
          r="112"
        />
        <ellipse
          class="art-orbit"
          cx="320"
          cy="210"
          rx="196"
          ry="60"
          transform="rotate(-24 320 210)"
        />
        <circle
          class="art-star"
          cx="176"
          cy="100"
          r="8"
        />
        <circle
          class="art-star"
          cx="467"
          cy="308"
          r="10"
        />
      </template>
      <template v-else-if="scene === 'study'">
        <path
          class="art-book"
          d="M126 112h150c24 0 43 19 43 43v160H168c-23 0-42-19-42-42z"
        />
        <path
          class="art-book"
          d="M514 112H364c-24 0-43 19-43 43v160h151c23 0 42-19 42-42z"
        />
        <path
          class="art-book-line"
          d="M178 161h84m-84 34h69m129-34h84m-84 34h69"
        />
        <circle
          class="art-planet"
          cx="321"
          cy="277"
          r="27"
        />
        <ellipse
          class="art-orbit"
          cx="321"
          cy="277"
          rx="53"
          ry="16"
          transform="rotate(-24 321 277)"
        />
      </template>
      <template v-else>
        <path
          class="art-bolt"
          d="m361 54-147 192h93l-28 120 165-214h-96z"
        />
        <circle
          class="art-planet"
          cx="176"
          cy="296"
          r="32"
        />
        <circle
          class="art-star"
          cx="468"
          cy="112"
          r="10"
        />
      </template>
    </g>
  </svg>
</template>
