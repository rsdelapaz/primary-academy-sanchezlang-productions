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

### PA-017 — Acabado artístico de los bocetos

- Marcos vectoriales originales de nueve cortes, con bordes luminosos y materiales propios de cada mundo. Pop Adventure incorpora biseles metálicos dorados y cristales; Galaxy, superficies de consola y energía cian. Logotipos temáticos en juego y resultado, no un nuevo sistema de logotipos para la aplicación.
- HUD con indicadores circulares, métricas doradas, jerarquía tipográfica y palabra entre comillas destacada sin alterar la pregunta. Se conserva el árbol semántico de controles, áreas táctiles y foco de teclado; las capas ornamentales no capturan eventos.
- Conserva el arte WebP existente y el modo Focus sin escenas o marcos ornamentales. No introduce dependencias ni recursos raster adicionales.
- Validación: 103 pruebas y 1384 ejercicios válidos; transferencia inicial estimada 301,2 KiB (límite 350 KiB). Partidas completas, resultado y repetición verificados en Chromium con viewports 320, 390, 1672 y 2048 px. Pendiente prueba en dispositivos físicos y aceptación visual.

### Aceptación de dirección y siguiente diseño (27/11/2026)

- Dirección aprueba explícitamente el acabado visual de PA-017 en el commit `f1a2e80` («Es una pasada. Este es el camino»). Se adopta como referencia de calidad visual para todas las pantallas, no únicamente portada, partida y victoria. La aprobación artística no equivale a una aceptación funcional en todos los dispositivos.
- Los bocetos validados por dirección serán criterios de aceptación visual. Reutilizar escenarios WebP, marcos SVG y materiales temáticos originales; no convertir interfaces en imágenes ni añadir motores de renderizado o dependencias por motivos puramente decorativos. Mantener contraste, legibilidad, navegación y rendimiento móvil.
- Próxima propuesta: extender el acabado artístico al wizard de partida. En modalidad, dos tarjetas ilustradas de igual protagonismo, Relámpago (puntos por acierto) y Tesoro (llaves y cofres). Progreso inequívoco: 1 Modalidad, 2 Duración, 3 Dificultad. Seleccionar modalidad avanza directamente; volver conserva la selección. No añadir opciones de respuesta, cantidades de preguntas, pasos ni CTA redundantes. Focus permanece minimalista e independiente del mundo.
- Estado: bocetos de Galaxy y Pop Adventure presentados a dirección. Pendiente aprobación antes de implementar cambios de UI. Conservar las reglas, contenidos, autoavance y áreas táctiles de PA-017.

### PA-017 — Wizard épico, extensible e inicio automático (27/11/2026)

**Decisiones de dirección:** aprobada la propuesta de escalar las modalidades a partir del catálogo existente; aprobado el inicio automático con una cuenta atrás de cinco segundos cancelable e inicio manual inmediato. El usuario aprueba los bocetos de Galaxy y Pop Adventure. No se incorporan modalidades nuevas, motor adicional ni dependencias.

- Modalidad, duración y dificultad comparten una tarjeta de selección reutilizable, progreso de tres pasos y marcos vectoriales existentes. Modalidad usa las ilustraciones originales extraídas de los bocetos aprobados (sin textos ni controles incrustados), WebP cargados solo en el mundo activo; el fondo y la cabecera reutilizan los activos de partida. Las otras dos pantallas usan distintivos vectoriales de progreso/dificultad. Focus sigue sin raster ni decoración.
- Alta de otra modalidad: implementar su estado, estrategia y rama exhaustiva de `applyModeAnswer` en `src/domain/game-modes.ts`, manteniendo evaluación compartida y declarando compatibilidad de ejercicios. La nueva definición entra automáticamente en `GAME_MODES` y en la rejilla. Opcionalmente añadir texto breve y arte propio por mundo en `src/presentation/mode-card.ts`; sin personalización se muestran título/descripción reales y un distintivo genérico. No hay que editar la plantilla de selección ni ampliar el antiguo enum visual de dos modalidades (se ha eliminado del dominio). El motor, sus reglas y las pruebas de una modalidad nueva siguen siendo responsabilidad del incremento correspondiente. La rejilla se adapta al número de tarjetas sin imponer dos columnas.
- Solo elegir explícitamente una dificultad compatible arma una cuenta atrás de 5 s; JUGAR la adelanta y Detener activa el inicio manual. Volver, cambiar opciones/tema, abandonar, cambiar de pestaña y usar Tab/Escape cancelan. El inicio automático de sesión es independiente del avance entre preguntas. Al volver se preservan las elecciones compatibles sin rearmar el temporizador. Se utiliza el controlador de temporización existente y se cancela al desmontar.
- Verificado: 109 pruebas, 1384 ejercicios válidos, frontera del dominio intacta, typecheck y lint focalizado, build y presupuesto (<350 KiB de transferencia inicial). Smoke tests Chromium en Galaxy y Pop Adventure, 320/390/768/1280/1672 px, partida manual y automática, regreso, cambios de dificultad y tema, ajustes, teclado, Focus, autoestudio, partida de matemáticas y respuesta escrita. Pendiente aceptación en dispositivos físicos.

## PA-018 — Centro de misiones y selector de mundos épicos (27/11/2026)

**Decisión de dirección:** aprobados los bocetos de portada y selector. Se acepta sustituir A/Z por la Union Jack: Inglés queda claramente separado de una futura Lengua (libro o escritura); Matemáticas mantiene referencias a operaciones. No se incorporan materias, modalidades ni datos falsos.

- Portadas Galaxy y Pop Adventure: cabeceras y pie integrados en la escena, tarjetas de materia ilustradas con marcos SVG de PA-017, Autoestudio y Mi colección como acciones secundarias. La misma rejilla y componente `HomeSubjectCard` se alimentan del catálogo; añadir una materia no exige modificar la vista. El arte opcional se registra por ID/mundo en `src/presentation/subject-card.ts`; sin él, el icono vectorial genérico permite acceder al contenido de inmediato. Los títulos y acciones siguen en HTML, no incrustados en las ilustraciones.
- Recursos originales en `public/art/subjects/`: Inglés generado con ImageGen a partir de los bocetos aprobados (bandera holográfica Galaxy, bandera mágica Pop Adventure, libro, pedestal; sin textos ni marcos); Matemáticas extraído del arte de los bocetos. WebP de ~16–19 KiB por tarjeta. Escenarios de portada de escritorio recomprimidos sin cambiar resolución ni composición.
- Selector de mundos: miniaturas WebP de escenarios existentes en `public/art/worlds/` (~4,4 KiB por mundo) solamente al expandir el selector, indicación visual y accesible del mundo activo, cierre al pulsar fuera o Escape, devolución del foco al selector. Focus usa iconos vectoriales y no solicita fondos ni miniaturas raster; no altera el contenido o sesiones.
- Favicon: adaptación del escudo R dorado aprobado a `public/favicon.ico`, optimizado para pestañas (16, 24, 32, 48, 64 px, 7,1 KiB). Se conserva el título y la referencia HTML existente.
- Verificación: typecheck, ESLint focalizado, seis pruebas de metadatos de materias, build y presupuesto ampliado para incluir la suma real de las tarjetas, favicon, CSS de mundo e iconos. Transferencia inicial estimada 337,3 KiB (límite 350 KiB); no hay nuevas dependencias ni cambios de dominio o contenidos. Smoke tests Chromium 320/390/768/1280/1672 px, ambos mundos, Focus, menú, colección, autoestudio y navegación a configuración/partida. Pendiente validación en dispositivos físicos y aceptación de dirección.
- Prueba adicional del catálogo: se simularon Lengua y Ciencias naturales exclusivamente mediante interceptación de la respuesta HTTP del manifiesto en Chromium. Cuatro tarjetas, fallback vectorial y rejilla sin desbordamiento horizontal comprobados a 320 y 1672 px; el manifiesto de producción no se modificó.

## PA-019 — Cuaderno de estudio premium (27/11/2026)

**Decisión de dirección:** el autoestudio debe ser una experiencia académica tranquila y diferenciada del juego, con la misma identidad RetoNautas. Sin escenarios raster, temporizadores, puntajes ni animaciones decorativas.

- Preparación en una pantalla: materias semánticas derivadas del catálogo (Union Jack, operaciones y fallback neutro), tema cuando hay varios, 5/10/20 tarjetas y CTA único. Por defecto todos los niveles y 10 tarjetas cuando hay contenido suficiente; selección de nivel y cantidad personalizada plegadas. Se conservan validaciones de disponibilidad.
- Tarjetas de memoria de lectura: papel claro, pregunta conservada al descubrir la respuesta y explicación del contenido original, controles «Necesito repasar»/«Lo sabía» y foco lógico. Las acciones permanecen visibles en móvil/tablet incluso con contenido largo. Galaxy, Pop Adventure y Focus siguen siendo independientes de la sesión.
- El progreso cuenta tarjetas autoevaluadas únicas. Una tarjeta no recordada queda inmediatamente «Para repasar», una no evaluada «Sin revisar». Se mantiene el límite de tres presentaciones por tarjeta en la ronda; terminar antes no marca lo no revisado como revisado.
- El resumen ofrece repaso exacto de las tarjetas no recordadas o no revisadas, preservando contenido y versión. Nueva sesión vuelve a seleccionar del banco con la configuración original, incluso tras repasar un subconjunto. Sin persistencia ni repetición espaciada entre días (fuera de este hito).
- Validación: typecheck, 10 pruebas focalizadas, ESLint focalizado, build, presupuesto inicial 337,8 KiB (límite 350 KiB), smoke tests Chromium en ambos mundos y Focus, escritorio 1440 px, tablet 768 px, móviles 320/390 px; incluyendo pregunta, respuesta, calificación, cierre temprano, selección exacta y nueva sesión. Pendiente aceptación en dispositivos físicos. No se han modificado bancos de preguntas ni dependencias.

## PA-020 — Misión del Tesoro: ruta, cámara y colección (27/11/2026)

- Se conserva la lógica de llaves, costes, puntuación, identificadores de tesoros y colecciones locales. No hay azar, compras, vidas ni tareas adicionales para conseguir recompensas.
- Ruta ilustrada durante la partida y en resultados; tres estados legibles (faltan llaves, disponible y conseguido). La acción «Abrir cofres» está accesible desde la barra de respuesta fija, también en móvil.
- Cámara compartida: seleccionar el cofre, conocer su coste, guardar llaves y seguir; escena de descubrimiento con cofre abierto, reliquia protagonista, progreso real y acceso a la misma colección. Distingue una adquisición nueva de una ya guardada.
- La colección de portada y resultados comparte las tarjetas con la galería de la revelación. Las reliquias no descubiertas son reconocibles; se conserva la insignia de misión perfecta.
- Avance automático: concede una pausa de elección al desbloquear un cofre por primera vez en la sesión; no interrumpe de nuevo por una oferta que ya se mostró. Los diálogos suspenden el temporizador. El niño puede continuar sin abrir cofres.
- Diez ilustraciones originales generadas para RetoNautas, aisladas y comprimidas a WebP transparente (448 × 448, 465 366 bytes entre los dos mundos). Solo se solicita el mundo activo y Focus mantiene los SVG sin descargar las ilustraciones. Respeta reducción de movimiento, sin vídeo ni dependencias nuevas.
- Validación: `npm run check` completo, 118 pruebas, 2 paquetes/1384 ejercicios válidos, frontera de dominio y presupuesto inicial de 342,1 KiB (máximo 350 KiB). Pruebas Chromium de portada/colección, apertura durante el juego y resultados, avance automático, navegación y Focus; Galaxy y Pop Adventure a 1440, 768, 390 y 320 px en las combinaciones probadas. Pendiente validación en Safari/iPad y dispositivos físicos por dirección. Los minijuegos quedan fuera de este hito hasta observar la recepción del modo actual.

### PA-020 — Acabado editorial de créditos (27/11/2026)

- Sustituye la expansión del pie de página por un diálogo nativo temático: escudo propio, identidad de RetoNautas, producción, proyecto educativo y atribución artística. Focus mantiene la versión simple. Reutiliza el arte vectorial existente, sin recursos raster nuevos.
- El cierre devuelve el foco al botón que lo abrió; Escape también cierra. Abrir los créditos cancela el inicio automático del wizard y suspende el avance automático cuando hay una partida activa; no modifica su contenido ni puntuación.
- Verificación: typecheck, ESLint de archivos modificados, 12 pruebas de avance automático, build y presupuesto inicial (344,0 KiB / 350 KiB); diálogo inspeccionado en ambos mundos, 1440/768/390/320 px y Focus, cierre por teclado y botón. Se reserva espacio al final de las pantallas con barras de acción fijas para que estas no oculten el acceso a créditos.
