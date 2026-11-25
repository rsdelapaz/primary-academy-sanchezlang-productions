# Contrato de contenidos JSON v1

Este contrato permite que el equipo editorial cree asignaturas y temas sin modificar el motor. JSON es el formato que consume la aplicación. CSV podrá ser una futura herramienta de edición/importación; no forma parte del runtime ni de este incremento.

## Archivos de referencia

- Catálogo: `public/content/manifest.json`.
- Paquete de ejemplo válido: `public/content/packages/english-irregular-verbs.json` y `public/content/packages/mathematics-addition.json` (fixtures técnicos, no contenido aprobado).
- Esquemas: `src/content/manifest.schema.json` y `src/content/package.schema.json`.
- Ejemplo intencionalmente inválido: `examples/content/invalid-package.json`.
- Validador reproducible: `npm run validate:content`.

Los esquemas JSON son la autoridad estructural compartida por el runtime y el comando de validación. `src/domain/content.ts` tipa el subconjunto operativo; `src/content/validators.mjs` añade restricciones entre campos que JSON Schema no puede expresar de forma portable. El mismo validador se usa en runtime y CLI.

## Versionado

- `schemaVersion` identifica el contrato; actualmente debe ser `"1.0.0"`. Un cambio incompatible requiere una versión mayor y soporte explícito en el motor.
- `contentVersion` es independiente para el catálogo y para cada paquete referenciado. El paquete debe coincidir con `contentVersion` del tema en el catálogo.
- Recomendación editorial: patch para correcciones sin cambiar significado; minor para contenido compatible añadido; major para cambios editoriales incompatibles o sustitución de identificadores.
- IDs son estables, minúsculos, ASCII y no dependen de idioma, texto visible ni posición. No reutilizar IDs retirados para otro significado.

## Catálogo

La raíz tiene `schemaVersion`, `contentVersion` y `subjects`. El catálogo puede tener cero asignaturas para representar una publicación vacía. Cada asignatura contiene `id`, `title` y un array `topics`, que también puede estar vacío. Un tema contiene `id`, `title`, `packagePath` y `contentVersion`.

`packagePath` es una ruta relativa a la raíz del sitio, siempre bajo `content/packages/`; no usar URLs absolutas, `..`, HTML ni scripts. El loader añade el base path de Vite/GitHub Pages y comprueba que la ruta permanezca dentro de la aplicación.

Cada combinación asignatura/tema y cada ruta de paquete debe ser única. El paquete declara los mismos IDs y versión que el catálogo.

## Paquete educativo

Campos raíz:

| Campo | Significado |
|---|---|
| `schemaVersion`, `contentVersion` | Versiones del contrato y del paquete. |
| `subjectId`, `topicId` | Referencias al catálogo. |
| `concepts` | Conceptos de este paquete (`id`, `label`, descripción opcional). |
| `learningObjectives` | Objetivos (`id`, `label`) referenciados por ejercicios. |
| `exercises` | Ejercicios con IDs únicos dentro del paquete. |

Cada ejercicio comparte `id`, `type`, `conceptId`, `learningObjectiveIds`, `difficulty` (`beginner`, `intermediate`, `advanced`), `tags`, `instructionLanguage`, `exerciseLanguage`, `explanationLanguage`, `prompt` y `explanation`. Los idiomas usan etiquetas tipo BCP 47 (`es`, `en`, `es-MX`). `context`, `hints`, `answerVariants` y `media` son opcionales. Un recurso multimedia solo referencia rutas locales seguras bajo `content/media/` con extensiones permitidas por el esquema.

`single_choice`, usado por las modalidades recreativas, requiere entre 2 y 8 `options` (`id`, `text`) y un `correctOptionId` que referencia una opción existente. Los IDs de opciones no se repiten en un ejercicio. Ordenar las opciones en el JSON no fija su presentación: el motor genera el orden al iniciar la pregunta.

`flashcard` requiere `front` y `back` y se presenta en el área de autoestudio, sin evaluación objetiva ni puntuación. Un paquete puede mezclar `single_choice` y `flashcard`; cada experiencia selecciona únicamente los ejercicios de su tipo compatible.

### Tipos contemplados por el contrato

Solo `single_choice` y `flashcard` tienen presentación operativa. Las siguientes estructuras se validan para preparar evolución; el loader las rechaza como no operativas:

- `multiple_choice`: `options` y `correctOptionIds` no vacíos, referidos a opciones existentes.
- `true_false`: `correctValue` booleano.
- `typed_answer`: `acceptedAnswers` y `caseSensitive` opcional.
- `fill_blank`: `textWithBlanks` con marcadores `{{id}}` y una lista `blanks` con respuestas aceptadas por marcador.
- `matching`: pares estables con `left` y `right`.
- `ordering`: elementos identificados y `correctOrder` que contiene exactamente esos IDs.

No añadir lógica o propiedades específicas de una asignatura al formato universal. La validación rechaza versiones incompatibles, campos inesperados, IDs/referencias inválidas, duplicados, respuestas que no apuntan a opciones válidas y tipos todavía no operativos.

## Seguridad y ejemplo

Todos los textos son datos, no markup. La interfaz los interpola como texto escapado; no usar `v-html`, `eval`, scripts ni ejecutar contenido descargado. Los medios se validan como recursos locales y no como URL arbitrarias.

Ejemplo mínimo de ejercicio:

```json
{
  "id": "sample-question-001",
  "type": "single_choice",
  "conceptId": "sample-concept",
  "learningObjectiveIds": ["sample-objective"],
  "difficulty": "beginner",
  "tags": [],
  "instructionLanguage": "es",
  "exerciseLanguage": "es",
  "explanationLanguage": "es",
  "prompt": "¿Cuánto es 2 + 3?",
  "explanation": "2 más 3 es igual a 5.",
  "options": [
    { "id": "sample-option-a", "text": "4" },
    { "id": "sample-option-b", "text": "5" }
  ],
  "correctOptionId": "sample-option-b"
}
```

El ejemplo inválido de `examples/content/invalid-package.json` conserva estructura válida, pero su respuesta correcta apunta a un ID inexistente; el CLI comprueba que el validador lo rechace.
