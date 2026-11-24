# Arquitectura implementada

## Límites

- `public/content/`: catálogo y paquetes JSON independientes. Se cargan cuando el recorrido los necesita.
- `src/content/`: esquemas JSON Schema, servicio de carga y validador Ajv. Parte de `unknown`; aplica el mismo contrato al validar en runtime y en CLI.
- `src/domain/`: contratos, selección/mezcla, ejercicio `single_choice`, sesión y puntuación en TypeScript puro. No importa Vue, Router, DOM, storage ni paquetes temáticos.
- `src/presentation/`: adaptadores reactivos Vue para catálogo y sesión. La sesión de dominio es la única fuente de estado de la partida; no hay flags duplicados en vistas.
- `src/views/` y `src/router.ts`: páginas universales parametrizadas por IDs de asignatura, tema y modalidad.
- Persistencia: no implementada. `GameResult` contiene clasificación/versiones estables; `getRankingKey` distingue temas, modalidad, duración, dificultad, configuración, contenido y scoring. Un futuro adaptador puede guardar resultados sin introducir proveedor ni backend en el dominio.

## Decisiones relevantes

- El contrato de `src/content/package.schema.json` describe ocho tipos de ejercicio. El runtime valida la forma completa, rechaza referencias/respuestas incorrectas y luego declara no operativos todos salvo `single_choice`.
- `GameConfiguration` soporta presets corta/media/larga (5/10/20) y personalizada. Si la selección filtrada no tiene suficientes ejercicios, no se permite iniciar; la selección no repite preguntas.
- Fisher-Yates recibe una fuente aleatoria inyectable y opera sobre copias. Cada opción se mezcla al crear la sesión, nunca durante el render.
- `answerQuestion` comprueba IDs de ejercicio y opción. Las funciones devuelven estado nuevo y bloquean transiciones no válidas.
- La navegación usa hash history para GitHub Pages; las guardas bloquean juego/resultados/revisión sin una sesión en estado compatible.
- Los datos se muestran como texto escapado; no se interpreta HTML/JavaScript de paquetes.
