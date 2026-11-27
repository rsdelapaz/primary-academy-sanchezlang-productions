<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import galaxyBrand from '../assets/epic/galaxy-brand.svg'
import popBrand from '../assets/epic/pop-brand.svg'
import { useThemePreference } from '../presentation/theme-preference'
import { setCreditsOpen } from '../presentation/credits-visibility'

defineProps<{ year: number }>()

const route = useRoute()
const { activeTheme, focusMode } = useThemePreference()
const dialog = ref<InstanceType<typeof globalThis.HTMLDialogElement> | null>(null)
const logoUrl = computed(() => focusMode.value
  ? `${import.meta.env.BASE_URL}brand/retonautas-logo.svg`
  : activeTheme.value === 'galaxy' ? galaxyBrand : popBrand)

function show(): void {
  if (!dialog.value || dialog.value.open) return
  dialog.value.showModal()
  setCreditsOpen(true)
}

function onClose(): void {
  if (!dialog.value?.open) setCreditsOpen(false)
}

function close(): void {
  dialog.value?.close()
  setCreditsOpen(false)
}

watch(() => route.fullPath, close)
onBeforeUnmount(close)

defineExpose({ show })
</script>

<template>
  <dialog
    ref="dialog"
    class="credits-dialog"
    aria-labelledby="credits-title"
    @close="onClose"
  >
    <div class="credits-shell">
      <header class="credits-heading">
        <span
          class="credits-rule"
          aria-hidden="true"
        ></span>
        <h2 id="credits-title">
          Créditos
        </h2>
        <span
          class="credits-rule"
          aria-hidden="true"
        ></span>
      </header>
      <div class="credits-content">
        <div class="credits-identity">
          <img
            :src="logoUrl"
            alt=""
            aria-hidden="true"
            width="112"
            height="112"
            class="credits-emblem"
            loading="lazy"
            decoding="async"
          />
          <p class="credits-wordmark">
            RetoNautas
          </p>
          <p class="credits-tagline">
            Aprender también es una aventura.
          </p>
        </div>
        <dl class="credits-team">
          <div>
            <dt>Una producción de</dt>
            <dd>Sánchez Lang Productions</dd>
          </div>
          <div>
            <dt>Proyecto educativo</dt>
            <dd>Primary Academy</dd>
          </div>
          <div>
            <dt>Dirección artística</dt>
            <dd>Ilustraciones originales del proyecto</dd>
            <dd class="credits-detail">
              Recursos gráficos creados con asistencia de IA.
            </dd>
          </div>
        </dl>
      </div>
      <footer class="credits-signoff">
        <p>© {{ year }} Sánchez Lang Productions</p>
        <button
          class="button primary credits-return"
          type="button"
          autofocus
          @click="close"
        >
          Volver a la aventura <span aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  </dialog>
</template>
