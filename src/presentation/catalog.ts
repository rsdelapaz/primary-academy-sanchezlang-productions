import { ref } from 'vue'
import type { ContentManifest, ContentPackage, ContentSubject, ContentTopicReference } from '../domain/content'
import { contentService } from '../content/service'

export function useCatalog() {
  const manifest = ref<ContentManifest | null>(null)
  const loading = ref(false)
  const error = ref('')

  async function loadManifest(): Promise<ContentManifest | null> {
    loading.value = true
    error.value = ''
    try {
      manifest.value = await contentService.loadManifest()
      return manifest.value
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'No se pudo cargar el catálogo.'
      return null
    } finally {
      loading.value = false
    }
  }

  async function loadPackage(
    subject: ContentSubject,
    topic: ContentTopicReference,
  ): Promise<ContentPackage | null> {
    loading.value = true
    error.value = ''
    try {
      return await contentService.loadPackage(subject, topic)
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'No se pudo cargar el contenido.'
      return null
    } finally {
      loading.value = false
    }
  }

  return { manifest, loading, error, loadManifest, loadPackage }
}
