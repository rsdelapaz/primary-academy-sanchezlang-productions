# Estado PA-002

Estado: completado y verificado.

## Entregado

- Motor puro TypeScript: Content contracts, Exercise Engine, Game Engine, scoring y resultados.
- Catálogo JSON y paquetes versionados con JSON Schemas; validación Ajv común para runtime y CLI.
- Navegación universal por IDs, presets 5/10/20 y cantidad personalizada limitada al banco disponible.
- Dos asignaturas de fixtures técnicos, tipo `single_choice`; ningún contenido se considera aprobado.
- Contrato editorial en `docs/CONTENT_FORMAT.md`, con ejemplos válidos e inválidos.
- Sesión como fuente única; guardas de rutas, revisión y reinicio conservan configuración.
- CI y workflow Pages manual ejecutan `npm run check` antes de publicar.

## Verificado

- `npm ci`: correcto, 0 vulnerabilidades.
- `npm run check`: lint, typecheck, 18 pruebas, validación de contenido, frontera de dominio, build y presupuesto aprobados.
- Dominio: 5 módulos sin imports de Vue ni contenidos concretos.
- Contenido: 2 paquetes / 10 ejercicios válidos; el fixture inválido es rechazado.
- Navegador: partida de 5 preguntas, 3 incorrectas, resultados (2/5), revisión y reinicio.
- Rutas directas de juego/resultados sin sesión redirigen al inicio.
- Responsive comprobado: viewport 320 px (pantalla 320 px) y escritorio 1280 px (pantalla de juego 760 px).
- Bundle: inicio 83.8 KiB JS gzip, 1.9 KiB CSS gzip, 86.3 KiB transferencia estimada; distribución completa 277.5 KiB sin comprimir. Chunks JS diferidos 7.7 KiB gzip; paquetes 7.7 KiB sin comprimir.

## Límites aceptados

- Sesión solo en memoria; recargar descarta el progreso.
- Solo `single_choice` se ejecuta; los otros siete tipos están definidos y rechazados como no operativos.
- Persistencia, proveedores de ranking, CSV y producción de contenido editorial quedan fuera de PA-002.
- No se ejecutó despliegue.
