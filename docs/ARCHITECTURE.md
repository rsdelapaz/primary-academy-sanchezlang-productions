# Arquitectura implementada

## Límites

- `public/content/`: catálogo y paquetes JSON versionados, cargados por demanda.
- `src/content/`: JSON Schema, servicio de carga y validación runtime/CLI. Los paquetes externos se validan desde `unknown`, incluidas sus referencias y respuestas.
- `src/domain/`: contratos, aleatoriedad, evaluación, selección de ejercicios, sesiones recreativas, tesoros y `StudySession`. TypeScript puro, sin dependencias de Vue, DOM, almacenamiento o contenidos concretos.
- `src/application/`: coordinación de casos de uso reutilizables, como el reto recomendado.
- `src/presentation/`: adaptadores reactivos para sesión y navegación, preferencias de tema/sonido y coordinación del game feel.
- `src/views/` y `src/components/`: composición de experiencias con Vue 3. Las vistas no son duplicadas por tema; componentes comunes consumen estado mediante props y eventos.
- `src/themes/` y `src/styles.css`: tokens Pop Adventure/Galaxy, estilos responsive y reduced-motion. `UniverseArtwork.vue` aporta SVG inline originales para ambos universos.
- `public/art/`: cuatro WebP editoriales, separados por tema y viewport. Home calcula una única fuente inicial según el tema activo y `matchMedia`; las rutas usan `BASE_URL` de Vite.

## Decisiones relevantes

- El contrato permite `single_choice`, `typed_answer` y `flashcard`; los dos primeros se usan en las modalidades recreativas y `flashcard` en autoestudio. Los demás tipos no están operativos.
- Reto Relámpago y Misión del Tesoro comparten sesión y evaluación. La estrategia de modalidad aporta únicamente el estado/reglas específicas; llaves y cofres no cambian la evaluación académica.
- `StudySession` es independiente de la evaluación competitiva. No asigna puntuación y reinserta tarjetas pendientes según sus reglas propias.
- Fisher-Yates recibe aleatoriedad inyectable y trabaja sobre copias. Preguntas y opciones obtienen orden al crear/reiniciar sesión; la presentación corrige por ID y conserva opciones durante cada pregunta.
- La configuración calcula disponibilidad sobre ejercicios compatibles con experiencia, modalidad, formato y dificultad. Las duraciones preset y personalizada no exceden el banco elegible.
- Home inicia la configuración directamente cuando la materia tiene un tema; con varios, muestra selección de tema. Autoestudio conserva su acceso separado. Configuración no cambia silenciosamente dificultad o duración y bloquea las combinaciones sin banco suficiente.
- Cambiar tema carga tokens CSS y actualiza la presentación; no reinicia ni muta partidas. Solo preferencias visuales y de sonido se guardan localmente; no se guarda progreso ni se recopilan datos personales.
- `check:bundle` incluye en la transferencia inicial estimada la variante gráfica de mayor tamaño (solo una se carga por visita) e informa el peso de cada recurso WebP.
- Los efectos se coordinan desde acontecimientos/transiciones existentes. Audio opcional se activa por interacción, puede estar deshabilitado y nunca es requisito para jugar.
- Router y guardas usan IDs estables; las rutas de juego/resultados/revisión requieren estado compatible. El build está preparado para GitHub Pages.
- El contenido se representa como texto escapado; no se interpreta HTML ni JavaScript de los paquetes.

No existe `docs/MASTER_REQUIREMENTS.md` en este repositorio; esta documentación describe solo el estado implementado.
