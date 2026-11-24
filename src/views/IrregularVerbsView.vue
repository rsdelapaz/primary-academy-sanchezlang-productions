<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section
    class="screen"
    aria-labelledby="topic-title"
  >
    <RouterLink
      class="back-link"
      to="/ingles"
    >← Inglés</RouterLink>
    <p class="eyebrow">
      Tema
    </p>
    <h1 id="topic-title">
      Verbos irregulares
    </h1>
    <p class="lead">
      Primero elige una modalidad disponible.
    </p>
    <div class="topic-grid">
      <RouterLink
        class="mode-card"
        to="/ingles/irregular-verbs/quiz"
      >
        <span
          class="topic-icon"
          aria-hidden="true"
        >✓</span>
        <span>
          <strong>Quiz clásico</strong>
          <small>18 preguntas, una por ejercicio</small>
        </span>
        <span aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </section>
</template>
