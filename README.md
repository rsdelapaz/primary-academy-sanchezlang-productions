# Primary Academy

Aplicación educativa ligera para practicar verbos irregulares en español e inglés.

## Requisitos

- Node.js 22 LTS o compatible.
- npm 10 o compatible.

## Instalación

```bash
npm ci
npm run dev
```

Abre la URL que muestre Vite.

## Comprobaciones

```bash
npm run lint
npm run typecheck
npm run test
npm run validate:content
npm run build
npm run check:bundle
npm run check
```

`npm run validate:content` valida el catálogo y todos los paquetes JSON. El formato editorial está en [docs/CONTENT_FORMAT.md](./docs/CONTENT_FORMAT.md).

El presupuesto de carga inicial es 150 KiB JS gzip, 35 KiB CSS gzip y 350 KiB de recursos iniciales estimados con gzip para HTML/JS/CSS/JSON/SVG. `npm run check:bundle` informa además de chunks diferidos, distribución completa y paquetes.

## Flujo

Inicio → Asignatura → Tema → Modalidad → Configuración → Partida → Resultados → Revisión.

El catálogo actual incluye solo fixtures técnicos de inglés y matemáticas; no son contenido pedagógico aprobado.