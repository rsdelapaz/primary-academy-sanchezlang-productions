<script setup lang="ts">
import { computed } from 'vue'
import type { ThemeId } from '../presentation/theme-preference'

const props = defineProps<{ scene: 'game' | 'victory'; theme: ThemeId }>()
const url = computed(() => `${import.meta.env.BASE_URL}art/${props.theme}-${props.scene}`)
</script>

<template>
  <div
    class="epic-backdrop"
    :class="`epic-backdrop--${scene}`"
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
