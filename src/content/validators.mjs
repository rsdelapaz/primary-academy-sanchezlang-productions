import Ajv2020 from 'ajv/dist/2020.js'

export function createContentValidators(manifestSchema, packageSchema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true })
  const validateManifestSchema = ajv.compile(manifestSchema)
  const validatePackageSchema = ajv.compile(packageSchema)

  function validateManifest(value) {
    if (!validateManifestSchema(value)) {
      throw new Error(`Catálogo inválido: ${ajv.errorsText(validateManifestSchema.errors)}`)
    }

    const subjectIds = new Set()
    const topicIds = new Set()
    const packagePaths = new Set()
    for (const subject of value.subjects) {
      if (subjectIds.has(subject.id)) throw new Error(`Asignatura duplicada: ${subject.id}`)
      subjectIds.add(subject.id)
      for (const topic of subject.topics) {
        const key = `${subject.id}/${topic.id}`
        if (topicIds.has(key)) throw new Error(`Tema duplicado: ${key}`)
        if (packagePaths.has(topic.packagePath)) throw new Error(`Paquete referenciado más de una vez: ${topic.packagePath}`)
        topicIds.add(key)
        packagePaths.add(topic.packagePath)
      }
    }
    return value
  }

  function validatePackage(value, reference) {
    if (!validatePackageSchema(value)) {
      throw new Error(`Paquete inválido: ${ajv.errorsText(validatePackageSchema.errors)}`)
    }
    if (value.subjectId !== reference.subjectId || value.topicId !== reference.topicId) {
      throw new Error('El paquete no coincide con la asignatura y el tema solicitados.')
    }
    if (value.contentVersion !== reference.contentVersion) {
      throw new Error(`Versión de contenido incompatible: se esperaba ${reference.contentVersion} y llegó ${value.contentVersion}.`)
    }

    const concepts = new Set(value.concepts.map(({ id }) => id))
    const objectives = new Set(value.learningObjectives.map(({ id }) => id))
    if (concepts.size !== value.concepts.length) throw new Error('Concepto duplicado.')
    if (objectives.size !== value.learningObjectives.length) throw new Error('Objetivo de aprendizaje duplicado.')
    const exerciseIds = new Set()
    for (const exercise of value.exercises) {
      if (exerciseIds.has(exercise.id)) throw new Error(`Ejercicio duplicado: ${exercise.id}`)
      exerciseIds.add(exercise.id)
      if (!concepts.has(exercise.conceptId)) throw new Error(`Concepto inexistente: ${exercise.conceptId}`)
      for (const id of exercise.learningObjectiveIds) {
        if (!objectives.has(id)) throw new Error(`Objetivo de aprendizaje inexistente: ${id}`)
      }
      if (exercise.type === 'single_choice' || exercise.type === 'multiple_choice') {
        const optionIds = exercise.options.map(({ id }) => id)
        if (new Set(optionIds).size !== optionIds.length) {
          throw new Error(`Opción duplicada en el ejercicio: ${exercise.id}`)
        }
        const correctIds = exercise.type === 'single_choice'
          ? [exercise.correctOptionId]
          : exercise.correctOptionIds
        if (correctIds.some((id) => !optionIds.includes(id))) {
          throw new Error(`Respuesta correcta inexistente en el ejercicio: ${exercise.id}`)
        }
      }
      if (exercise.type === 'fill_blank') {
        const blankIds = exercise.blanks.map(({ id }) => id)
        if (new Set(blankIds).size !== blankIds.length) throw new Error(`Hueco duplicado en el ejercicio: ${exercise.id}`)
        for (const id of blankIds) {
          if (!exercise.textWithBlanks.includes(`{{${id}}}`)) {
            throw new Error(`Referencia a hueco inexistente en el texto: ${id}`)
          }
        }
      }
      if (exercise.type === 'matching' &&
        new Set(exercise.pairs.map(({ id }) => id)).size !== exercise.pairs.length) {
        throw new Error(`Par duplicado en el ejercicio: ${exercise.id}`)
      }
      if (exercise.type === 'ordering') {
        const itemIds = exercise.items.map(({ id }) => id)
        if (new Set(itemIds).size !== itemIds.length ||
          exercise.correctOrder.length !== itemIds.length ||
          exercise.correctOrder.some((id) => !itemIds.includes(id))) {
          throw new Error(`Orden de respuesta inválido en el ejercicio: ${exercise.id}`)
        }
      }
      if (exercise.type === 'typed_answer') {
        const caseSensitive = exercise.caseSensitive === true
        const normalizedAnswers = exercise.acceptedAnswers.map((answer) => {
          const normalized = answer.normalize('NFC').trim()
          return caseSensitive ? normalized : normalized.toLowerCase()
        })
        if (normalizedAnswers.some((answer) => answer.length === 0)) {
          throw new Error(`Respuesta aceptada vacía en el ejercicio: ${exercise.id}`)
        }
        if (new Set(normalizedAnswers).size !== normalizedAnswers.length) {
          throw new Error(`Respuestas aceptadas duplicadas tras normalización en el ejercicio: ${exercise.id}`)
        }
      }
      if (exercise.type !== 'single_choice' &&
        exercise.type !== 'typed_answer' &&
        exercise.type !== 'flashcard') {
        throw new Error(`Tipo de ejercicio no operativo: ${exercise.type}`)
      }
    }
    return value
  }

  return { validateManifest, validatePackage }
}
