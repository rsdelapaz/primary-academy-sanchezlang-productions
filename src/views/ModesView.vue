<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { GAME_MODES } from '../domain/game'
import { useCatalogSelection } from '../presentation/catalog-selection'

const { subject, topic, loading, error, load } = useCatalogSelection()
onMounted(() => { void load() })
</script>

<template>
  <section
    class="screen"
    aria-labelledby="modes-title"
  >
    <RouterLink
      class="back-link"
      :to="subject && topic ? { name: 'topic', params: { subjectId: subject.id, topicId: topic.id } } : { name: 'home' }"
    >← Tema</RouterLink>
    <p
      v-if="loading"
      role="status"
    >
      Cargando modalidades...
    </p>
    <p
      v-else-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
    <p v-else-if="!subject || !topic">
      No encontramos ese tema.
    </p>
    <template v-else>
      <p class="eyebrow">
        {{ topic.title }}
      </p>
      <h1 id="modes-title">
        Modalidad
      </h1>
      <nav
        class="topic-grid"
        aria-label="Modalidades disponibles"
      >
        <RouterLink
          v-for="mode in GAME_MODES"
          :key="mode.id"
          class="mode-card"
          :to="{ name: 'configuration', params: { subjectId: subject.id, topicId: topic.id, modeId: mode.id } }"
        >
          <span
            class="topic-icon"
            aria-hidden="true"
          >✓</span>
          <span><strong>{{ mode.title }}</strong><small>Responde y recibe retroalimentación</small></span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </nav>
    </template>
  </section>
</template>
