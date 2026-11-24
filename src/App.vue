<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <RouterLink
        class="brand"
        to="/"
        aria-label="Ir al inicio"
      >
        <span
          class="brand-mark"
          aria-hidden="true"
        >A</span>
        <span>Academia de Exploradores</span>
      </RouterLink>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
