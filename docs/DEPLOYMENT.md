# GitHub Pages

El proyecto usa:

- `base: '/primary-academy-sanchezlang-productions/'` en Vite.
- Hash routing para evitar requisitos de rewrites.
- Workflow `.github/workflows/pages.yml` con activación manual.

## Despliegue previsto

1. Ejecutar y comprobar `npm ci` y `npm run check` (incluye validación de todo el contenido y presupuesto).
2. Abrir GitHub Actions.
3. Ejecutar manualmente "Deploy GitHub Pages (manual)".
4. Verificar en Settings → Pages que la fuente sea "GitHub Actions".

No hay despliegue automático ni se ejecuta desde este incremento.
