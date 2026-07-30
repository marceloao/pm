# Pasos generales del proyecto

Parte 1: Planificación

Enriquece este documento para planificar cada una de estas partes en detalle, con subpasos enumerados en una lista de verificación que el agente deberá marcar, e incluyendo pruebas y criterios de éxito para cada uno. Crea también un archivo CLAUDE.md dentro del directorio frontend que describa el código existente. Asegúrate de que el usuario revise y apruebe el plan.

**Checklist**
- [x] Enriquecer docs/PLAN.md con checklist, pruebas y criterios de éxito por parte
- [x] Crear frontend/CLAUDE.md describiendo el código frontend existente
- [x] Obtener aprobación explícita del usuario sobre este plan

**Pruebas**
- Revisión manual de que ambos documentos son Markdown válido y consistentes con el código real del repo.

**Criterios de éxito**
- El usuario aprueba explícitamente este documento antes de iniciar la Parte 2.

Parte 2: Estructura

Configura la infraestructura de Docker, el backend en backend/ con FastAPI y escribe los scripts de inicio y parada en el directorio scripts/. Esto debería servir un ejemplo de HTML estático para confirmar que un ejemplo de "hola mundo" funciona correctamente en local y también realizar una llamada a la API.

**Checklist**
- [x] Crear proyecto backend en backend/ con FastAPI, usando "uv" como gestor de paquetes
- [x] Escribir Dockerfile y docker-compose.yml para empaquetar el backend
- [x] Servir una página HTML estática de "hola mundo" en `/`
- [x] Exponer un endpoint de API de ejemplo (`/api/hello`) que el HTML "hola mundo" invoca
- [x] Escribir scripts/start (Mac/Linux/PC) y scripts/stop (Mac/Linux/PC) que levanten/bajen el contenedor
- [x] Actualizar backend/CLAUDE.md y scripts/CLAUDE.md con la descripción real (ya no placeholder)

**Pruebas**
- Build de la imagen Docker sin errores.
- Levantar el contenedor con el script de start y hacer una petición manual (curl/navegador) a `/` y al endpoint de API de ejemplo.
- Verificar que el script de stop detiene el contenedor correctamente.

**Criterios de éxito**
- Un solo comando (script de start) deja el contenedor corriendo y accesible en localhost.
- La página "hola mundo" carga en `/` y la llamada a la API de ejemplo responde correctamente.

Parte 3: Integración del frontend

Actualiza el código para que el frontend se compile y sirva de forma estática, de modo que la aplicación muestre el tablero Kanban de demostración en /. Realice pruebas unitarias y de integración exhaustivas.

**Checklist**
- [x] Configurar el build de Next.js para generar salida estática servible por FastAPI
- [x] Montar los assets estáticos del frontend en `/` desde el backend
- [x] Reemplazar la página "hola mundo" de la Parte 2 por el tablero Kanban de demo
- [x] Verificar que los tests existentes (Vitest y Playwright) siguen funcionando contra el nuevo empaquetado

**Pruebas**
- `npm run test` (Vitest) sobre el frontend, sin cambios de resultado respecto al estado actual.
- `npm run test:e2e` (Playwright) apuntando al contenedor Docker en vez de al dev server de Next.
- Prueba manual: abrir `/` servido por el backend y confirmar que el tablero Kanban demo se ve y funciona (drag-and-drop incluido).

**Criterios de éxito**
- El tablero Kanban demo se sirve completo desde `/` dentro del contenedor Docker (sin `next dev`).
- Toda la suite de tests existente (unitarios + e2e) pasa contra ese contenedor.

Parte 4: Añadir una experiencia de inicio de sesión simulada

Actualiza la aplicación para que, al acceder a / por primera vez, se requiera iniciar sesión con credenciales ficticias ("usuario", "contraseña") para ver el tablero Kanban y poder cerrar sesión. Realiza pruebas exhaustivas.

**Checklist**
- [x] Crear pantalla/formulario de login con usuario y contraseña
- [x] Validar credenciales hardcodeadas (`user` / `password`) según CLAUDE.md
- [x] Bloquear el acceso al tablero Kanban si no hay sesión iniciada
- [x] Persistir la sesión (localStorage) para no perder el login al refrescar
- [x] Añadir botón de logout que cierre la sesión y vuelva a pedir credenciales

**Pruebas**
- Vitest de componente para el formulario de login (credenciales correctas e incorrectas).
- Playwright e2e: intento de acceso directo al tablero sin login (debe redirigir a login), login exitoso, login fallido con mensaje de error, logout y verificación de que vuelve a pedir credenciales.

**Criterios de éxito**
- No es posible ver el tablero Kanban sin iniciar sesión primero.
- Tras logout, refrescar la página no conserva acceso al tablero.

Parte 5: Modelado de la base de datos

Propón un esquema de base de datos para el tablero Kanban y guárdalo en formato JSON. Documenta el enfoque de la base de datos en la carpeta docs/ y obtén la aprobación del usuario.

**Checklist**
- [x] Diseñar esquema (usuarios, columnas, tarjetas) compatible con "1 tablero por usuario" del MVP
- [x] Guardar el esquema en formato JSON dentro de docs/ (`docs/db-schema.json`)
- [x] Escribir documento en docs/ explicando decisiones de diseño (`docs/DATABASE.md`)

**Pruebas**
- Revisión manual de que el JSON es válido y cubre todas las entidades necesarias (usuario, tablero, columna, tarjeta) con sus relaciones.

**Criterios de éxito**
- El usuario aprueba explícitamente el esquema antes de iniciar la Parte 6.

Parte 6: Backend

Añade rutas API para que el backend pueda leer y modificar el tablero Kanban de un usuario determinado; realiza pruebas exhaustivas con pruebas unitarias del backend. Si la base de datos no existe, se debe crear.

**Checklist**
- [x] Implementar modelos/tablas SQLite según el esquema aprobado en la Parte 5
- [x] Crear la base de datos automáticamente si no existe al iniciar el backend
- [x] Endpoint para leer el tablero completo de un usuario
- [x] Endpoints para crear/editar/mover/eliminar tarjetas
- [x] Endpoint para renombrar columnas
- [x] Escribir tests unitarios de backend (pytest) para cada endpoint

**Pruebas**
- pytest cubriendo: creación de BD desde cero, lectura de tablero, CRUD de tarjetas, renombrado de columnas, casos de error (ej. tarjeta inexistente).

**Criterios de éxito**
- Arrancar el backend contra una BD inexistente la crea automáticamente con el esquema correcto.
- La suite pytest pasa completa y cubre todos los endpoints nuevos.

Parte 7: Frontend + Backend

Haz que el frontend utilice la API del backend para que la aplicación funcione como un tablero Kanban persistente. Realiza pruebas exhaustivas.

**Checklist**
- [x] Reemplazar los datos hardcodeados (`initialData` en src/lib/kanban.ts) por llamadas fetch al backend
- [x] Adaptar las acciones existentes (mover tarjeta, renombrar columna, añadir/eliminar tarjeta) para que llamen a la API en vez de mutar solo estado local
- [x] Manejar estados de carga y error en la UI
- [x] Actualizar/adaptar los tests existentes (Vitest y Playwright) al flujo con backend real

**Pruebas**
- Playwright e2e contra el backend real: cargar tablero, mover tarjeta, refrescar la página y verificar que el cambio persiste.
- Vitest para el manejo de estados de carga/error (ej. backend caído).

**Criterios de éxito**
- Refrescar la página conserva el estado del tablero (persistido en SQLite), no en memoria del navegador.
- Toda acción del usuario (mover, editar, renombrar) se refleja en la base de datos.

Parte 8: Conectividad con IA

Permite que el backend realice una llamada a la IA mediante OpenRouter. Prueba la conectividad con una prueba simple de "2+2" y asegúrate de que la llamada a la IA funcione correctamente.

**Checklist**
- [x] Configurar cliente OpenRouter en el backend usando `OPENROUTER_API_KEY` desde .env
- [x] Usar el modelo `openai/gpt-oss-20b:free` (ver nota en CLAUDE.md raíz: `120b:free` dejó de estar disponible gratis en OpenRouter, confirmado con la API real)
- [x] Crear endpoint mínimo de prueba que envíe una pregunta simple (ej. "¿cuánto es 2+2?") y devuelva la respuesta de la IA
- [x] Asegurarse de que la API key nunca se expone al frontend

**Pruebas**
- pytest (o prueba manual con curl) que llama al endpoint de prueba y verifica una respuesta coherente de la IA.

**Criterios de éxito**
- El endpoint de prueba devuelve una respuesta correcta de la IA vía OpenRouter.
- La API key solo existe en el backend/.env, nunca en el bundle del frontend.

Parte 9: Ahora, amplía la llamada al backend para que siempre llame a la IA con el JSON del tablero Kanban, además de la pregunta del usuario (y el historial de la conversación). La IA debe responder con Salidas Estructuradas que incluyan la respuesta al usuario y, opcionalmente, una actualización del Kanban. Realiza pruebas exhaustivas.

**Checklist**
- [x] Definir el schema de Structured Outputs (respuesta de texto + actualización opcional del tablero, como lista de acciones tipadas)
- [x] Enviar en cada llamada: JSON del tablero actual, historial de conversación y pregunta del usuario
- [x] Aplicar la actualización del tablero en la BD cuando la IA la incluya
- [x] Manejar el caso en que la IA no propone ninguna actualización

**Pruebas**
- pytest con casos: la IA responde solo texto (sin tocar el tablero), la IA responde con una actualización válida (se aplica correctamente), la IA responde con una actualización inválida (se rechaza sin romper el tablero).
- Nota: el modelo gratuito `openai/gpt-oss-20b:free` ignora `response_format: json_schema` de OpenRouter (verificado manualmente contra la API real); el schema se describe en el prompt del sistema y se parsea de forma tolerante (extrayendo el primer `{`...último `}` del contenido).

**Criterios de éxito**
- Las actualizaciones propuestas por la IA se reflejan correctamente en la base de datos cuando son válidas.
- Un tablero inválido propuesto por la IA nunca corrompe el estado persistido.

Parte 10: Ahora, añade un atractivo widget lateral a la interfaz de usuario que admita el chat completo con la IA y permita que el LLM (según lo determine) actualice el Kanban en función de sus Salidas Estructuradas. Si la IA actualiza el Kanban, la interfaz de usuario se actualizará automáticamente.

**Checklist**
- [x] Diseñar e implementar el panel lateral de chat (siguiendo la paleta de colores del CLAUDE.md raíz)
- [x] Conectar el chat al endpoint de la Parte 9 (envío de mensajes, mantenimiento de historial)
- [x] Refrescar automáticamente el tablero en la UI cuando la IA aplique una actualización
- [x] Pruebas exhaustivas end-to-end del flujo completo de chat + actualización de tablero

**Pruebas**
- Playwright e2e simulando una conversación en el chat que dispara un cambio de tablero (ej. "crea una tarjeta X en la columna Y") y verificando que aparece sin recargar manualmente.
- Playwright e2e de una conversación que no modifica el tablero (solo respuesta de texto).

**Criterios de éxito**
- El usuario puede chatear con la IA desde la barra lateral y ver el tablero actualizarse automáticamente cuando corresponde, sin recargar la página.
- El chat mantiene el historial de la conversación durante la sesión.
