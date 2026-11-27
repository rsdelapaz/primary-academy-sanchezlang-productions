<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ContentSubject } from '../domain/content'
import { useThemePreference } from '../presentation/theme-preference'
import { getSubjectArtwork } from '../presentation/subject-card'
import SubjectGlyph from './SubjectGlyph.vue'

const props = defineProps<{ subject: ContentSubject }>()
const { activeTheme, focusMode } = useThemePreference()
const artwork = computed(() => {
  if (focusMode.value) return null
  const path = getSubjectArtwork(props.subject.id, activeTheme.value)
  return path ? `${import.meta.env.BASE_URL}${path}` : null
})

const target = computed(() => props.subject.topics.length === 1
  ? {
      name: 'choose-challenge',
      params: { subjectId: props.subject.id, topicId: props.subject.topics[0].id },
    }
  : { name: 'subject', params: { subjectId: props.subject.id } })
</script>

<template>
  <RouterLink
    class="home-subject"
    :to="target"
  >
    <span
      class="home-subject-visual"
      :class="{ 'home-subject-visual--glyph': !artwork }"
      aria-hidden="true"
    >
      <img
        v-if="artwork"
        :key="artwork"
        :src="artwork"
        alt=""
        width="448"
        height="256"
        decoding="async"
      >
      <SubjectGlyph
        v-else
        :subject-id="subject.id"
      />
    </span>
    <span class="home-subject-copy">
      <strong>{{ subject.title }}</strong>
      <span>Elegir reto <span aria-hidden="true">→</span></span>
    </span>
    <span
      class="home-card-crest"
      aria-hidden="true"
    ></span>
  </RouterLink>
</template>
