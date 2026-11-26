<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogSelection } from '../presentation/catalog-selection'

const { subject, loading, error, load } = useCatalogSelection()
onMounted(() => { void load() })
</script>

<template>
  <section
    class="screen"
    aria-labelledby="subject-title"
  >
    <RouterLink
      class="back-link"
      :to="{ name: 'home' }"
    >← Inicio</RouterLink>
    <p
      v-if="loading"
      role="status"
    >
      Cargando asignatura...
    </p>
    <p
      v-else-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
    <p v-else-if="!subject">
      No encontramos esa asignatura.
    </p>
    <template v-else>
      <p class="eyebrow">
        Asignatura
      </p>
      <h1 id="subject-title">
        {{ subject.title }}
      </h1>
      <p class="lead">
        Elige un tema para continuar.
      </p>
      <nav
        v-if="subject.topics.length"
        class="topic-grid"
        aria-label="Temas"
      >
        <RouterLink
          v-for="topic in subject.topics"
          :key="topic.id"
          class="topic-card"
          :to="{ name: 'topic', params: { subjectId: subject.id, topicId: topic.id } }"
        >
          <span
            class="topic-icon"
            aria-hidden="true"
          >✦</span>
          <span><strong>{{ topic.title }}</strong><small>Contenido educativo</small></span>
          <span aria-hidden="true">→</span>
        </RouterLink>
      </nav>
      <p v-else>
        Esta asignatura todavía no tiene temas.
      </p>
    </template>
  </section>
</template>
