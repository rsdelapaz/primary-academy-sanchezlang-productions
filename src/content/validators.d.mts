import type { ContentManifest, ContentPackage, ContentTopicReference } from '../domain/content'

export interface PackageReference extends ContentTopicReference {
  subjectId: string
  topicId: string
}

export declare function createContentValidators(
  manifestSchema: object,
  packageSchema: object,
): {
  validateManifest(value: unknown): ContentManifest
  validatePackage(value: unknown, reference: PackageReference): ContentPackage
}
