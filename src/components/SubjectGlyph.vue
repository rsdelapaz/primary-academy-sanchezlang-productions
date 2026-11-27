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
    <svg
      v-if="subjectId === 'english'"
      x="2"
      y="9"
      width="60"
      height="30"
      viewBox="0 0 60 30"
      overflow="hidden"
    >
      <path
        fill="#012169"
        d="M0 0h60v30H0z"
      />
      <path
        stroke="#fff"
        stroke-width="6"
        d="m0 0 60 30M60 0 0 30"
      />
      <path
        fill="#c8102e"
        d="M0 0v2.24l24.52 12.26h4.48L0 0Zm60 0h-4.48L31 12.26v2.24L60 0ZM60 30v-2.24L35.48 15.5H31L60 30ZM0 30h4.48L29 17.74V15.5L0 30Z"
      />
      <path
        stroke="#fff"
        stroke-width="10"
        d="M30 0v30M0 15h60"
      />
      <path
        stroke="#c8102e"
        stroke-width="6"
        d="M30 0v30M0 15h60"
      />
    </svg>
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
      d="M6 10Q20 5 32 14Q44 5 58 10V38Q44 34 32 42Q20 34 6 38ZM32 14V42"
      class="subject-glyph-line"
    />
  </svg>
</template>
