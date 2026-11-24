<script setup lang="ts">
import { RouterLink } from 'vue-router'
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
      <RouterLink
        class="button primary"
        to="/ingles"
      >Elegir área</RouterLink>
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
