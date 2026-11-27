<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  selected?: boolean
  disabled?: boolean
}>()
defineEmits<{ select: [] }>()
</script>

<template>
  <button
    class="configuration-card quick-setup-choice wizard-choice"
    :class="{ active: selected }"
    type="button"
    :aria-pressed="!!selected"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span
      v-if="$slots.art"
      class="wizard-choice-visual"
      aria-hidden="true"
    >
      <slot name="art" />
    </span>
    <span class="wizard-choice-copy">
      <strong>{{ title }}<span
        class="wizard-choice-arrow"
        aria-hidden="true"
      >{{ selected ? '✓' : '›' }}</span></strong>
      <small v-if="description">{{ description }}</small>
    </span>
  </button>
</template>
