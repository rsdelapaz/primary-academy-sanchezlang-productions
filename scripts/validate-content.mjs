import { readFileSync } from 'node:fs'
import manifestSchema from '../src/content/manifest.schema.json' with { type: 'json' }
import packageSchema from '../src/content/package.schema.json' with { type: 'json' }
import { createContentValidators } from '../src/content/validators.mjs'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const validators = createContentValidators(manifestSchema, packageSchema)
const manifest = validators.validateManifest(readJson('public/content/manifest.json'))
const exerciseIds = new Set()
let packages = 0
let exercises = 0

for (const subject of manifest.subjects) {
  for (const topic of subject.topics) {
    const content = validators.validatePackage(readJson(`public/${topic.packagePath}`), {
      ...topic,
      subjectId: subject.id,
      topicId: topic.id,
    })
    packages += 1
    for (const exercise of content.exercises) {
      if (exerciseIds.has(exercise.id)) throw new Error(`Ejercicio duplicado en el catálogo: ${exercise.id}`)
      exerciseIds.add(exercise.id)
      exercises += 1
    }
  }
}

const invalidExample = readJson('examples/content/invalid-package.json')
try {
  validators.validatePackage(invalidExample, {
    subjectId: invalidExample.subjectId,
    id: invalidExample.topicId,
    topicId: invalidExample.topicId,
    title: 'Ejemplo inválido',
    contentVersion: invalidExample.contentVersion,
    packagePath: 'examples/content/invalid-package.json',
  })
  throw new Error('El ejemplo inválido se aceptó inesperadamente.')
} catch (error) {
  if (error instanceof Error && error.message === 'El ejemplo inválido se aceptó inesperadamente.') throw error
  if (!(error instanceof Error) || !error.message.includes('Respuesta correcta inexistente')) throw error
}

console.log(`Contenido válido: ${packages} paquetes, ${exercises} ejercicios; ejemplo inválido rechazado.`)
