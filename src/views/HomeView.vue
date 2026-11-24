<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCatalog } from '../presentation/catalog'

const { manifest, loading, error, loadManifest } = useCatalog()

onMounted(() => { void loadManifest() })
</script>

<template>
  <section
    class="screen home-screen"
    aria-labelledby="home-title"
  >
    <div class="hero-copy">
      <p class="eyebrow">
        Misión del día
      </p>
      <h1 id="home-title">
        Aprende, explora y descubre
      </h1>
      <p>Entrena tu conocimiento en pequeñas aventuras.</p>
      <p
        v-if="loading"
        role="status"
      >
        Cargando asignaturas...
      </p>
      <p
        v-else-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
      </p>
      <p v-else-if="!manifest?.subjects.length">
        Todavía no hay asignaturas disponibles.
      </p>
      <nav
        v-else
        class="subject-links"
        aria-label="Asignaturas"
      >
        <RouterLink
          v-for="subject in manifest.subjects"
          :key="subject.id"
          class="button primary"
          :to="{ name: 'subject', params: { subjectId: subject.id } }"
        >
          {{ subject.title }}
        </RouterLink>
      </nav>
    </div>
    <div
      class="compass-card"
      aria-hidden="true"
    >
      <div class="compass">
        ✦
      </div>
      <span>Explorador/a</span>
    </div>
  </section>
</template>
