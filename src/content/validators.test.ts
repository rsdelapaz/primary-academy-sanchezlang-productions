import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ContentManifest } from '../domain/content'
import { createContentService } from './service'
import manifestSchema from './manifest.schema.json'
import packageSchema from './package.schema.json'
import { createContentValidators } from './validators.mjs'

const validators = createContentValidators(manifestSchema, packageSchema)
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'))
const manifestFile = readJson('public/content/manifest.json') as ContentManifest
const englishFile = readJson('public/content/packages/english-irregular-verbs.json')
const mathSubject = manifestFile.subjects.find(({ id }) => id === 'mathematics')!
const mathTopic = mathSubject.topics[0]
const mathFile = readJson(`public/${mathTopic.packagePath}`)

describe('contrato de contenido JSON', () => {
  it('carga paquetes de asignaturas distintas desde el servicio validado', async () => {
    const fixtures = new Map([
      ['https://academy.test/app/content/manifest.json', manifestFile],
      ['https://academy.test/app/content/packages/english-irregular-verbs.json', englishFile],
      [`https://academy.test/app/${mathTopic.packagePath}`, mathFile],
    ])
    const service = createContentService('https://academy.test/app/', async (url) => {
      const result = fixtures.get(url)
      if (!result) throw new Error('Not found')
      return result
    })
    const catalog = await service.loadManifest()
    expect(catalog.subjects).toHaveLength(2)
    const english = await service.loadPackage(catalog.subjects[0], catalog.subjects[0].topics[0])
    const maths = await service.loadPackage(catalog.subjects[1], catalog.subjects[1].topics[0])
    expect(english.exercises[0].type).toBe('single_choice')
    expect(maths.exercises[0].type).toBe('single_choice')
    expect(english.subjectId).not.toBe(maths.subjectId)
  })

  it('rechaza estructura, versiones y duplicados del catálogo', () => {
    expect(() => validators.validateManifest({ schemaVersion: '99.0.0' })).toThrow(/Catálogo inválido/)
    expect(validators.validateManifest({
      schemaVersion: '1.0.0',
      contentVersion: '1.0.0',
      subjects: [],
    }).subjects).toEqual([])
    expect(() => validators.validateManifest({
      schemaVersion: '1.0.0', contentVersion: '1.0.0',
      subjects: [{ id: 'same-id', title: 'A', topics: [{ id: 'topic-one', title: 'A', packagePath: 'content/packages/a.json', contentVersion: '1.0.0' }] },
        { id: 'same-id', title: 'B', topics: [{ id: 'topic-two', title: 'B', packagePath: 'content/packages/b.json', contentVersion: '1.0.0' }] }],
    })).toThrow(/Asignatura duplicada/)
    expect(() => validators.validateManifest({
      schemaVersion: '1.0.0', contentVersion: '1.0.0',
      subjects: [{ id: 'subject-one', title: 'A', topics: [
        { id: 'topic-one', title: 'A', packagePath: 'content/packages/a.json', contentVersion: '1.0.0' },
        { id: 'topic-two', title: 'B', packagePath: 'content/packages/a.json', contentVersion: '1.0.0' },
      ] }],
    })).toThrow(/referenciado más de una vez/)
  })

  it('rechaza referencias, versiones, opciones y tipos no operativos', () => {
    const catalog = validators.validateManifest(manifestFile)
    const topic = catalog.subjects[0].topics[0]
    const reference = { ...topic, subjectId: catalog.subjects[0].id, topicId: topic.id }
    expect(() => validators.validatePackage(englishFile, { ...reference, contentVersion: '9.0.0' })).toThrow(/incompatible/)

    const missingAnswer = structuredClone(englishFile) as Record<string, unknown>
    const exercises = missingAnswer.exercises as Array<Record<string, unknown>>
    exercises[0].correctOptionId = 'option-not-present'
    expect(() => validators.validatePackage(missingAnswer, reference)).toThrow(/Respuesta correcta inexistente/)

    const duplicateOption = structuredClone(englishFile) as Record<string, unknown>
    const duplicateExercises = duplicateOption.exercises as Array<Record<string, unknown>>
    const options = duplicateExercises[0].options as Array<Record<string, unknown>>
    options[1].id = options[0].id
    expect(() => validators.validatePackage(duplicateOption, reference)).toThrow(/Opción duplicada/)

    const missingConcept = structuredClone(englishFile) as Record<string, unknown>
    const conceptExercises = missingConcept.exercises as Array<Record<string, unknown>>
    conceptExercises[0].conceptId = 'concept-missing'
    expect(() => validators.validatePackage(missingConcept, reference)).toThrow(/Concepto inexistente/)

    const missingObjective = structuredClone(englishFile) as Record<string, unknown>
    const objectiveExercises = missingObjective.exercises as Array<Record<string, unknown>>
    objectiveExercises[0].learningObjectiveIds = ['objective-missing']
    expect(() => validators.validatePackage(missingObjective, reference)).toThrow(/Objetivo de aprendizaje inexistente/)

    const duplicateConcept = structuredClone(englishFile) as Record<string, unknown>
    const concepts = duplicateConcept.concepts as Array<Record<string, unknown>>
    concepts.push({ ...concepts[0] })
    expect(() => validators.validatePackage(duplicateConcept, reference)).toThrow(/Concepto duplicado/)

    const invalidMultiple = structuredClone(englishFile) as Record<string, unknown>
    const multipleExercises = invalidMultiple.exercises as Array<Record<string, unknown>>
    multipleExercises[0].type = 'multiple_choice'
    multipleExercises[0].correctOptionIds = ['missing-option']
    delete multipleExercises[0].correctOptionId
    expect(() => validators.validatePackage(invalidMultiple, reference)).toThrow(/Respuesta correcta inexistente/)

    const unsupported = structuredClone(englishFile) as Record<string, unknown>
    const unsupportedExercises = unsupported.exercises as Array<Record<string, unknown>>
    unsupportedExercises[0].type = 'true_false'
    unsupportedExercises[0].correctValue = true
    delete unsupportedExercises[0].options
    delete unsupportedExercises[0].correctOptionId
    expect(() => validators.validatePackage(unsupported, reference)).toThrow(/no operativo: true_false/)

    const duplicateExercise = structuredClone(englishFile) as Record<string, unknown>
    const repeatedExercises = duplicateExercise.exercises as Array<Record<string, unknown>>
    repeatedExercises[1].id = repeatedExercises[0].id
    expect(() => validators.validatePackage(duplicateExercise, reference)).toThrow(/Ejercicio duplicado/)
  })

  it('valida flashcards y permite paquetes mixtos sin omitir referencias compartidas', () => {
    const catalog = validators.validateManifest(manifestFile)
    const subject = catalog.subjects[0]
    const topic = subject.topics[0]
    const reference = { ...topic, subjectId: subject.id, topicId: topic.id }
    const mixed = structuredClone(englishFile) as Record<string, unknown>
    const exercises = mixed.exercises as Array<Record<string, unknown>>
    const quiz = exercises[0]
    exercises[0] = {
      id: 'technical-flashcard',
      type: 'flashcard',
      conceptId: quiz.conceptId,
      learningObjectiveIds: quiz.learningObjectiveIds,
      difficulty: quiz.difficulty,
      tags: [],
      instructionLanguage: 'es',
      exerciseLanguage: 'en',
      explanationLanguage: 'es',
      prompt: 'Technical fixture',
      explanation: 'Technical fixture only.',
      front: 'go',
      back: 'went',
    }

    const validated = validators.validatePackage(mixed, reference)
    expect(validated.exercises[0].type).toBe('flashcard')
    expect(validated.exercises[1].type).toBe('single_choice')

    const missingBack = structuredClone(mixed) as Record<string, unknown>
    const invalidExercises = missingBack.exercises as Array<Record<string, unknown>>
    delete invalidExercises[0].back
    expect(() => validators.validatePackage(missingBack, reference)).toThrow(/Paquete inválido/)
  })

  it('rechaza acceso fuera del base path y errores de red', async () => {
    const catalog = validators.validateManifest(manifestFile)
    const outside = createContentService('https://academy.test/app/', async () => catalog)
    await expect(outside.loadPackage(catalog.subjects[0], {
      ...catalog.subjects[0].topics[0],
      packagePath: '../../outside.json',
    })).rejects.toThrow(/fuera de la aplicación/)
    const network = createContentService('https://academy.test/app/', async () => {
      throw new Error('network down')
    })
    await expect(network.loadManifest()).rejects.toThrow('network down')
  })
})
