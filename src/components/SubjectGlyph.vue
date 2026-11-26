<script setup lang="ts">
defineProps<{
  subjectId: string
}>()
</script>

<template>
  <svg
    class="subject-glyph"
    viewBox="0 0 64 48"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="subjectId === 'english'">
      <text
        x="2"
        y="34"
        class="subject-glyph-letters"
      >A</text>
      <path
        d="M25 24h14m-5-5 5 5-5 5"
        class="subject-glyph-line"
      />
      <text
        x="42"
        y="34"
        class="subject-glyph-letters"
      >Z</text>
    </template>
    <template v-else-if="subjectId === 'mathematics'">
      <text
        x="2"
        y="38"
        class="subject-glyph-sum"
      >∑</text>
      <path
        d="M38 37V12m0 25h21M42 31l6-8 5 4 7-11"
        class="subject-glyph-line"
      />
    </template>
    <path
      v-else
      d="M10 12h44M10 24h44M10 36h44"
      class="subject-glyph-line"
    />
  </svg>
</template>
