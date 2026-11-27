# Estado de implementación

## PA-016 — Fluidez de partida (mobile first)

- Manual por defecto; avance automático opcional al elegir dificultad; se conserva al repetir partida.
- CTA fijo al responder (incluido «Ver resultados» en la última pregunta), con zona segura y sin reducir la altura de las respuestas. Las explicaciones largas pueden consultarse de forma voluntaria.
- Autoavance tras 3 s de acierto o 8 s de error; pausa al leer la explicación, ocultar la página, confirmar salida o disponer de cofres. Se puede adelantar manualmente o reanudar cuando corresponda.
- Controlador de temporización independiente de Vue y del dominio; se cancela al salir o cambiar de pregunta. Sin cambios de puntuación, contenido, reglas o dependencias.
- Verificación: `npm run check` (86 pruebas, 2 paquetes y 1384 ejercicios, presupuesto de bundle cumplido). Pendiente aceptación en dispositivos físicos por dirección.

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

## PA-017 — Experiencia épica

- Galaxy y Pop Adventure: escenarios originales de partida y victoria; ocho WebP responsivos (cuatro escenas), sin interfaces o texto incrustados. HUD unificado, tarjetas, respuestas y feedback integrados en ambos mundos. Área de respuestas estable; avance fijo.
- Resultado: cuatro mensajes según precisión exacta; insignia solo al acertar todo, récord por configuración existente y puntuación real. Repetir inicia una nueva sesión con la configuración anterior. Colección de insignia y tres tesoros realmente abiertos, persistida localmente, con migración compatible de récords.
- Focus: preferencia independiente del mundo, sin escenario raster ni efectos decorativos de puntos/rachas y contador instantáneo. Conserva los controles, el audio elegido y las reglas de juego.
- Sin cambios de contenido, motor de dominio, dependencias, validadores, scoring ni backend. Pendiente aceptación por dirección y pruebas en dispositivos físicos.
- Quality gate ejecutado: 97 pruebas, 2 paquetes/1384 ejercicios; frontera del dominio intacta. Presupuesto inicial estimado <350 KiB; nuevas escenas de 59–181 KiB por variante.
