# Estado de implementación

## PA-011C — Usabilidad y dirección artística

Estado: implementación técnica y smoke tests completados; pendiente aceptación visual del director. No declarar aprobado hasta recibirla.

### Entregado

- Skill `.agents/skills/child-game-ux/SKILL.md` y consulta obligatoria documentada en `AGENTS.md`.
- Home «¿A qué jugamos?»: materias principales, autoestudio independiente y acceso directo a configuración cuando hay un único tema.
- Configuración «¿Cómo jugamos?»: modalidad, respuesta, dificultad y duración separadas; combinaciones inviables se deshabilitan y explican sin reajustar otras elecciones.
- Cuatro WebP editoriales para Pop Adventure/Galaxy, con variante móvil/escritorio; marca corporativa únicamente en el footer.
- Sin cambios en `src/domain/` ni en los paquetes educativos: validación confirma 706 ejercicios.

### Verificado

- `npm run typecheck`, ESLint dirigido, build y `npm run check:bundle`: correctos.
- Vitest focalizado: 2 archivos, 23 pruebas aprobadas. `validate:content`: 2 paquetes y 706 ejercicios válidos.
- Navegador: selección, respuesta escrita, Misión del Tesoro y autoestudio; el cambio de tema conserva pregunta, texto escrito, opciones y tarjeta.
- Viewports 320, 390, 768 y 1280 px: CTA visible y sin desbordamiento horizontal.
- Carga inicial comprobada: un solo WebP del tema/viewport activo. Recursos: Pop desktop 174.8 KiB, Pop móvil 88.9 KiB, Galaxy desktop 178.8 KiB, Galaxy móvil 77.7 KiB.
- Presupuesto medido con la variante de arte más pesada: JS inicial 95.6 KiB gzip, CSS 7.3 KiB gzip y transferencia estimada 282.6 KiB.
- Capturas de portada y configuración en móvil/escritorio mostradas para revisión visual.

### Pendiente y límites

- Aceptación visual del director; las capturas no la sustituyen.
- El catálogo actual tiene un tema por materia; la rama de selección entre varios temas no pudo probarse con contenido real.
- No existe `docs/MASTER_REQUIREMENTS.md`. Sin commit, push ni despliegue.
