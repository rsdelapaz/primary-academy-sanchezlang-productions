<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeId } from '../presentation/theme-preference'

const props = defineProps<{ scene: 'game' | 'victory' | 'setup'; theme: ThemeId }>()
const artworkScene = computed(() => props.scene === 'setup' ? 'game' : props.scene)
const url = computed(() => `${import.meta.env.BASE_URL}art/${props.theme}-${artworkScene.value}`)
</script>

<template>
  <div
    class="epic-backdrop"
    :class="[`epic-backdrop--${artworkScene}`, { 'epic-backdrop--setup': scene === 'setup' }]"
    aria-hidden="true"
  >
    <picture :key="url">
      <source
        media="(max-width: 759px)"
        :srcset="`${url}-mobile.webp`"
        type="image/webp"
      >
      <img
        :src="`${url}-desktop.webp`"
        alt=""
        width="1600"
        height="900"
        decoding="async"
      >
    </picture>
  </div>
</template>
