import manifestSchema from './manifest.schema.json'
import packageSchema from './package.schema.json'
import type { ContentManifest, ContentPackage, ContentSubject, ContentTopicReference } from '../domain/content'
import { createContentValidators, type PackageReference } from './validators.mjs'

export interface ContentService {
  loadManifest(): Promise<ContentManifest>
  loadPackage(subject: ContentSubject, topic: ContentTopicReference): Promise<ContentPackage>
}

export type JsonFetcher = (url: string) => Promise<unknown>

const validators = createContentValidators(manifestSchema, packageSchema)

export function createContentService(
  baseUrl: string,
  fetchJson: JsonFetcher = async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Error de red ${response.status} al cargar contenido.`)
    const value: unknown = await response.json()
    return value
  },
): ContentService {
  const base = new URL(baseUrl, globalThis.location?.origin ?? 'http://localhost')

  async function getJson(path: string): Promise<unknown> {
    const url = new URL(path, base)
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error('La ruta de contenido está fuera de la aplicación.')
    }
    return fetchJson(url.toString())
  }

  return {
    async loadManifest() {
      const value = await getJson('content/manifest.json')
      return validators.validateManifest(value)
    },
    async loadPackage(subject, topic) {
      const reference: PackageReference = { ...topic, subjectId: subject.id, topicId: topic.id }
      const value = await getJson(topic.packagePath)
      return validators.validatePackage(value, reference)
    },
  }
}

export const contentService = createContentService(import.meta.env.BASE_URL)
