<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalogSelection } from '../presentation/catalog-selection'

const { subject, topic, loading, error, load } = useCatalogSelection()
onMounted(() => { void load() })
</script>

<template>
  <section
    class="screen"
    aria-labelledby="topic-title"
  >
    <RouterLink
      class="back-link"
      :to="subject ? { name: 'subject', params: { subjectId: subject.id } } : { name: 'home' }"
    >← Asignatura</RouterLink>
    <p
      v-if="loading"
      role="status"
    >
      Cargando tema...
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
        {{ subject.title }}
      </p>
      <h1 id="topic-title">
        {{ topic.title }}
      </h1>
      <p class="lead">
        Elige una modalidad disponible.
      </p>
      <RouterLink
        class="button primary"
        :to="{ name: 'modes', params: { subjectId: subject.id, topicId: topic.id } }"
      >Ver modalidades</RouterLink>
    </template>
  </section>
</template>
