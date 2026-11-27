<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import CollectionDialog from '../components/CollectionDialog.vue'
import HomeSubjectCard from '../components/HomeSubjectCard.vue'
import { useCatalog } from '../presentation/catalog'

const collection = ref<{ show: () => void } | null>(null)
const { manifest, loading, error, loadManifest } = useCatalog()
const subjects = computed(() => manifest.value?.subjects ?? [])
onMounted(() => { void loadManifest() })
</script>

<template>
  <section
    class="home-screen"
    aria-labelledby="home-title"
  >
    <div class="home-menu">
      <header class="home-menu-heading">
        <p class="eyebrow">
          Centro de misiones
        </p>
        <h1 id="home-title">
          ¿A qué jugamos?
        </h1>
      </header>

      <nav
        v-if="subjects.length"
        class="home-subject-grid"
        aria-label="Elige una materia"
      >
        <HomeSubjectCard
          v-for="subject in subjects"
          :key="subject.id"
          :subject="subject"
        />
      </nav>
      <p
        v-else-if="loading"
        class="home-status"
        role="status"
      >
        Cargando misiones...
      </p>
      <p
        v-else-if="error"
        class="home-status home-status--error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else
        class="home-status"
      >
        No hay misiones disponibles.
      </p>

      <div class="home-secondary-actions">
        <RouterLink
          class="home-study-link home-auxiliary"
          :to="{ name: 'choose-challenge', query: { experience: 'study' } }"
        >
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M5 11Q15 7 24 14Q33 7 43 11V36Q33 32 24 39Q15 32 5 36ZM24 14V39" />
          </svg>
          <span>
            <strong>Autoestudio</strong>
            <small>Tarjetas de memoria</small>
          </span>
        </RouterLink>
        <button
          class="home-collection-link home-auxiliary"
          type="button"
          @click="collection?.show()"
        >
          <svg
            viewBox="0 0 48 48"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 4H21L29 17M38 4H27L19 17M10 4L17 19M38 4L31 19M24 17a13 13 0 1 1 0 26 13 13 0 0 1 0-26Zm0 6 2 5 5.5.6-4.1 3.7 1.1 5.4-4.5-2.8-4.5 2.8 1.1-5.4-4.1-3.7 5.5-.6Z" />
          </svg>
          <span><strong>Mi colección</strong></span>
        </button>
      </div>
    </div>
    <CollectionDialog ref="collection" />
  </section>
</template>
