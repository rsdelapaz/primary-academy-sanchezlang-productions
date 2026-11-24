# Arquitectura

## Responsabilidades

- `src/content/`: datos independientes, cargados bajo demanda.
- `src/types/`: contratos de ejercicios y opciones.
- `src/game/`: aleatoriedad reproducible, sesión y puntuación.
- `src/views/`: presentación y coordinación de rutas.
- `src/router.ts`: navegación hash para hosting estático.

## Decisiones

- Vue 3 con Composition API y `script setup`; TypeScript estricto.
- Vue Router con historial hash para GitHub Pages.
- Fisher-Yates recibe una fuente de aleatoriedad inyectable y crea copias.
- La corrección usa `exerciseId`, `correctOptionId` y `selectedOptionId`.
- Cada pregunta conserva su secuencia visual de opciones hasta terminarla.
- No hay Pinia ni backend; la sesión vive en memoria.
- El contenido se carga dinámicamente al iniciar el quiz.
