<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section
    class="screen"
    aria-labelledby="english-title"
  >
    <RouterLink
      class="back-link"
      to="/"
    >← Inicio</RouterLink>
    <p class="eyebrow">
      Área de conocimiento
    </p>
    <h1 id="english-title">
      Inglés
    </h1>
    <div class="topic-grid">
      <RouterLink
        class="topic-card"
        to="/ingles/irregular-verbs"
      >
        <span
          class="topic-icon"
          aria-hidden="true"
        >AB</span>
        <span>
          <strong>Verbos irregulares</strong>
          <small>Pasado en contexto</small>
        </span>
        <span aria-hidden="true">→</span>
      </RouterLink>
    </div>
  </section>
</template>
