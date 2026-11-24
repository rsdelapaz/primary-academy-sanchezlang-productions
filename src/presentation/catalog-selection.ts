import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCatalog } from './catalog'

export function useCatalogSelection() {
  const route = useRoute()
  const catalog = useCatalog()
  const subject = computed(() => catalog.manifest.value?.subjects.find(({ id }) => id === route.params.subjectId) ?? null)
  const topic = computed(() => subject.value?.topics.find(({ id }) => id === route.params.topicId) ?? null)

  async function load() {
    await catalog.loadManifest()
  }

  return { ...catalog, subject, topic, load }
}
