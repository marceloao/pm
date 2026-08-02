# Frontend - Kanban Studio

## Estado actual

Next.js exportado como sitio estático (`output: "export"`, ver `next.config.ts`) y servido por el backend FastAPI en `/` (ver `backend/CLAUDE.md`). Desde la Parte 11, login/registro son reales contra el backend (`src/lib/auth.ts`, cookie de sesión httponly - no hay estado de auth en `localStorage`). Desde la Parte 12 un usuario puede tener varios tableros Kanban: `BoardSelector` permite crear/renombrar/eliminar/cambiar entre ellos, y el tablero activo se recuerda en `localStorage` (`src/hooks/useBoards.ts`). Desde la Parte 13, cualquier usuario puede cambiar su propia contraseña (`ChangePasswordForm`), y los usuarios `admin` tienen un botón "Administración" que abre `AdminPanel` (gestión de usuarios: crear, cambiar nivel, resetear contraseña, eliminar) - oculto para usuarios `basico`. Desde la Parte 14, toda la interfaz visible está en español. El tablero activo se carga y persiste contra la API real del backend (`GET/POST/PATCH/DELETE /api/*`). Además hay un panel lateral de chat con IA (`POST /api/ai/chat`) que opera sobre el tablero activo y puede actualizarlo automáticamente.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/postcss`, utility classes, sin CSS modules)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` para drag-and-drop
- Vitest + Testing Library para tests unitarios/componentes, Playwright para e2e

## Estructura

- `src/app/layout.tsx` - layout raíz, fuentes (Space Grotesk / Manrope), metadata
- `src/app/page.tsx` - única ruta `/`; mientras `useAuth()` verifica la sesión (`checkingSession`) no renderiza nada, luego decide entre `<LoginForm />` y `<KanbanBoard />`
- `src/app/globals.css` - import de Tailwind y variables CSS de la paleta de colores
- `src/components/LoginForm.tsx` - formulario con toggle login/registro (`onLogin`/`onRegister`, ambos `async` y devuelven un mensaje de error en español o `null`)
- `src/components/KanbanBoard.tsx` - componente cliente principal; usa `useBoards()` para la lista de tableros/tablero activo y `useBoard(activeBoardId)` para el contenido del tablero activo (carga/loading/error) y el `DndContext`; incluye `BoardSelector`, el botón "Cambiar contraseña" (abre `ChangePasswordForm`), el botón "Administración" (solo si `user.role === "admin"`, cambia a la vista `AdminPanel`) y el botón de cerrar sesión
- `src/components/BoardSelector.tsx` - selector de tablero: `<select>` para cambiar de tablero, input para renombrar el activo (persiste en `onBlur`), botón "+ Nuevo tablero" con formulario inline, y botón de eliminar (oculto si solo queda un tablero)
- `src/components/AdminPanel.tsx` - módulo de administración (solo alcanzable si `role === "admin"`): tabla de usuarios con `<select>` de nivel por fila (cambia `role` al instante), botón de resetear contraseña (modal con `ChangePasswordForm`-style input) y botón de eliminar (deshabilitado para el propio usuario); formulario para crear un usuario nuevo (`username`, `password`, `role`)
- `src/components/ChangePasswordForm.tsx` - modal con contraseña actual/nueva; usado tanto por cualquier usuario para su propia contraseña como internamente en `AdminPanel` para resetear la de otro usuario
- `src/components/KanbanColumn.tsx` - columna droppable/sortable, input de renombrado (persiste en `onBlur`), formulario de nueva tarjeta
- `src/components/KanbanCard.tsx` - tarjeta draggable (título, detalle, botón de eliminar con ícono de tacho de basura en SVG inline)
- `src/components/KanbanCardPreview.tsx` - vista de la tarjeta usada en el `DragOverlay` mientras se arrastra
- `src/components/NewCardForm.tsx` - formulario inline para agregar tarjetas
- `src/components/ChatSidebar.tsx` - panel lateral de chat con la IA: lista de mensajes (usuario/asistente), indicador "Pensando…" mientras espera respuesta, input + botón enviar
- `src/hooks/useAuth.ts` - sesión real contra el backend: al montar llama a `GET /api/auth/me` para saber si hay cookie de sesión válida (`checkingSession` mientras resuelve; expone el `user` completo, incluido `role`); expone `login`/`register`/`changePassword` (llaman a `src/lib/auth.ts`, devuelven un mensaje de error en español o `null` si fue exitoso, mapeando el `status` HTTP de `AuthError` en vez de mostrar el `detail` crudo del backend) y `logout`
- `src/hooks/useBoards.ts` - lista de tableros del usuario (`boards`, `loading`, `error`) y `activeBoardId` (recordado en `localStorage` bajo `kanban-active-board`); expone `switchBoard`, `addBoard`, `renameBoard`, `removeBoard` (llaman a `src/lib/api.ts`)
- `src/hooks/useBoard.ts` - carga el tablero identificado por `boardId` (o `null` si todavía no hay uno activo) cada vez que cambia (`board`, `loading`, `error`) y expone las acciones (`moveCard`, `renameColumn`/`commitRenameColumn`, `addCard`, `deleteCard`) que llaman a `src/lib/api.ts`, además de `setBoard` para reemplazar el tablero completo (usado cuando la IA lo actualiza)
- `src/hooks/useChat.ts` - historial de mensajes del chat (`messages`, `sending`, `error`) para el `boardId` activo (se reinicia al cambiar de tablero) y `sendMessage`, que llama a `api.sendChatMessage(boardId, message, history)`, agrega la respuesta al historial y notifica el tablero nuevo vía el callback `onBoardUpdate`
- `src/lib/auth.ts` - cliente HTTP para `/api/auth/*` (`login`, `register`, `logout`, `changePassword`, `fetchCurrentUser`); `AuthError` lleva el `status` HTTP y el `detail` del backend (usado por `useAuth` para decidir el mensaje en español, no se muestra el `detail` directamente)
- `src/lib/admin.ts` - cliente HTTP para `/api/admin/*` (`fetchUsers`, `createUser`, `updateUserRole`, `resetUserPassword`, `deleteUser`), usado por `AdminPanel`
- `src/lib/api.ts` - cliente HTTP sobre `fetch` (rutas relativas `/api/...`); mapea la forma de la API del backend al `BoardData` normalizado del frontend; incluye `fetchBoards`/`createBoard`/`renameBoard`/`deleteBoard` para `/api/boards*` y `sendChatMessage(boardId, message, history)` para `POST /api/ai/chat`
- `src/lib/kanban.ts` - tipos (`Card`, `Column`, `BoardData`) y la función pura `moveCard` (reordena/mueve tarjetas entre columnas; se usa tanto para la UI optimista como base para calcular qué mandarle a la API)
- `src/test/setup.ts` - matchers de `@testing-library/jest-dom` para Vitest
- `tests/login.spec.ts`, `tests/kanban.spec.ts`, `tests/persistence.spec.ts`, `tests/chat.spec.ts`, `tests/boards.spec.ts`, `tests/users.spec.ts` - specs e2e de Playwright

## Cómo funcionan los tableros

`useBoards()` (`src/hooks/useBoards.ts`) carga `GET /api/boards` al montar; si `localStorage` recuerda un `board_id` que sigue en la lista lo usa como activo, si no usa el primero. `BoardSelector` lee esa lista y el activo, y llama a `addBoard`/`renameBoard`/`removeBoard` (que a su vez llaman a `POST/PATCH/DELETE /api/boards*`). Al eliminar el tablero activo, se cambia automáticamente al primero que quede. El backend impide borrar el único tablero de un usuario (`400`).

`useBoard(boardId)` (`src/hooks/useBoard.ts`) hace `fetch` a `GET /api/boards/{boardId}` cada vez que `boardId` cambia y guarda el resultado en estado local (`useState`), normalizado igual que antes (`columns` con `cardIds` + mapa `cards`). Cada acción del usuario actualiza el estado local (para que la UI responda al instante, sobre todo el drag-and-drop) y además llama al endpoint correspondiente del backend para persistir:
- Mover una tarjeta: se recalcula el nuevo orden con la función pura `moveCard` (`src/lib/kanban.ts`), y el índice resultante de la tarjeta en su columna destino es lo que se manda como `position` a `POST /api/cards/{id}/move`.
- Agregar tarjeta: se llama primero a `POST /api/cards` (el id real lo asigna el backend) y recién con la respuesta se actualiza el estado local.
- Eliminar tarjeta: `DELETE /api/cards/{id}`, y si resuelve bien se actualiza el estado local.
- Renombrar columna: el input actualiza el estado local en cada tecla (`onRename`), pero solo persiste con `PATCH /api/columns/{id}` en el `onBlur` (`onRenameCommit`) para no mandar un request por letra.

Si falla alguna llamada a la API, `useBoard` guarda un mensaje en `error` (no revierte el cambio optimista - mantenido simple para el MVP).

## Cómo funciona el chat con IA

`ChatSidebar` (visible junto al tablero en `KanbanBoard`) recibe el `boardId` activo y usa `useChat(boardId, onBoardUpdate)`, que mantiene el historial de mensajes en estado local (se reinicia si el usuario cambia de tablero) y llama a `api.sendChatMessage(boardId, message, history)` (`POST /api/ai/chat`) en cada envío, operando siempre sobre el tablero activo. La respuesta trae `{reply, board}`: `reply` se agrega al historial como mensaje del asistente, y `board` (el tablero completo tras aplicar los cambios que la IA haya propuesto, o sin cambios si no propuso ninguno) se pasa vía el callback `onBoardUpdate` a `setBoard` de `useBoard`, reemplazando el estado del tablero en la UI sin necesidad de recargar la página. Si la llamada falla, se muestra un mensaje de error debajo de los mensajes (el historial no se pierde).

Drag-and-drop con `@dnd-kit`: `KanbanBoard` define el `DndContext` (sensor de puntero, detección de colisión `closestCorners`); cada columna es una zona `useDroppable` que envuelve un `SortableContext`; cada tarjeta usa `useSortable`; mientras se arrastra, un `DragOverlay` muestra `KanbanCardPreview`.

## Niveles de usuario y módulo de administración

`KanbanBoard` recibe el `user` autenticado (`{id, username, role}`) desde `page.tsx`. Si `role === "admin"` se muestra el botón "Administración", que cambia un estado local (`view`) entre `"board"` y `"admin"`; en `"admin"` se renderiza `AdminPanel` en vez del tablero (mismo patrón simple de vista, sin router adicional ya que la app sigue siendo una única ruta `/`). `AdminPanel` carga `GET /api/admin/users` al montar y ofrece crear/cambiar nivel/resetear contraseña/eliminar; el backend impide dejar el sistema sin ningún admin, por lo que el botón de eliminar se deshabilita para el propio usuario en la UI (además de la validación real en el backend).

Cualquier usuario (`admin` o `basico`) puede cambiar su propia contraseña con el botón "Cambiar contraseña" del header, que abre `ChangePasswordForm` (usa `useAuth().changePassword`, requiere la contraseña actual correcta).

## Idioma

Toda la interfaz visible (botones, textos, placeholders, mensajes de error mostrados al usuario) está en español desde la Parte 14. Los mensajes de error que vienen del backend (`AuthError.message`) no se muestran directamente: `useAuth` los traduce a español según el código HTTP (`401` -> "Usuario o contraseña incorrectos.", `409` -> "Ese nombre de usuario ya existe.", etc.), para no depender de que el backend responda en español.

**Limitación conocida**: los `fetch` de `src/lib/api.ts` usan rutas relativas (`/api/...`), asumiendo que el frontend se sirve desde el mismo origen que el backend (así es dentro de Docker, Parte 3). Corriendo `npm run dev` solo (sin el contenedor) no hay backend en el puerto 3000, así que el tablero va a mostrar el estado de error - el flujo de desarrollo completo es vía Docker (`scripts/start.sh`).

## Paleta de colores

Definida como variables CSS en `src/app/globals.css` (`:root`), consumida vía clases arbitrarias de Tailwind (`bg-[var(--...)]`, `text-[var(--...)]`). Coincide con la paleta del CLAUDE.md raíz: `--accent-yellow` (#ecad0a), `--primary-blue` (#209dd7), `--secondary-purple` (#753991), `--navy-dark` (#032147), `--gray-text` (#888888).

## Scripts

- `npm run dev` - servidor de desarrollo (sin backend real detrás, ver limitación arriba)
- `npm run build` - genera el export estático en `frontend/out` (usado por el `Dockerfile` del backend)
- `npm run lint` - ESLint
- `npm run test` / `npm run test:unit` - tests unitarios (Vitest)
- `npm run test:unit:watch` - Vitest en modo watch
- `npm run test:e2e` - tests e2e (Playwright; levanta `next dev` automáticamente)
- `E2E_BASE_URL=http://localhost:8000 npx playwright test` - corre la misma suite e2e contra el contenedor Docker real (con backend)
- `npm run test:all` - unitarios y luego e2e

