# Frontend - Kanban Studio

## Estado actual

Next.js exportado como sitio estático (`output: "export"`, ver `next.config.ts`) y servido por el backend FastAPI en `/` (ver `backend/CLAUDE.md`). Login simulado con credenciales hardcodeadas (`src/lib/auth.ts`) y sesión en `localStorage`. El tablero Kanban ya no usa datos hardcodeados: se carga y persiste contra la API real del backend (`GET/POST/PATCH/DELETE /api/*`).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (`@tailwindcss/postcss`, utility classes, sin CSS modules)
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` para drag-and-drop
- Vitest + Testing Library para tests unitarios/componentes, Playwright para e2e

## Estructura

- `src/app/layout.tsx` - layout raíz, fuentes (Space Grotesk / Manrope), metadata
- `src/app/page.tsx` - única ruta `/`; con `useAuth()` decide entre `<LoginForm />` y `<KanbanBoard />`
- `src/app/globals.css` - import de Tailwind y variables CSS de la paleta de colores
- `src/components/LoginForm.tsx` - formulario de login (usuario/contraseña hardcodeados)
- `src/components/KanbanBoard.tsx` - componente cliente principal; usa `useBoard()` para el estado del tablero (carga/loading/error) y el `DndContext`; botón de logout
- `src/components/KanbanColumn.tsx` - columna droppable/sortable, input de renombrado (persiste en `onBlur`), formulario de nueva tarjeta
- `src/components/KanbanCard.tsx` - tarjeta draggable (título, detalle, botón eliminar)
- `src/components/KanbanCardPreview.tsx` - vista de la tarjeta usada en el `DragOverlay` mientras se arrastra
- `src/components/NewCardForm.tsx` - formulario inline para agregar tarjetas
- `src/hooks/useAuth.ts` - sesión de login (`localStorage`)
- `src/hooks/useBoard.ts` - carga el tablero desde la API al montar (`board`, `loading`, `error`) y expone las acciones (`moveCard`, `renameColumn`/`commitRenameColumn`, `addCard`, `deleteCard`) que llaman a `src/lib/api.ts`
- `src/lib/auth.ts` - credenciales hardcodeadas y validación
- `src/lib/api.ts` - cliente HTTP sobre `fetch` (rutas relativas `/api/...`); mapea la forma de la API del backend al `BoardData` normalizado del frontend
- `src/lib/kanban.ts` - tipos (`Card`, `Column`, `BoardData`) y la función pura `moveCard` (reordena/mueve tarjetas entre columnas; se usa tanto para la UI optimista como base para calcular qué mandarle a la API)
- `src/test/setup.ts` - matchers de `@testing-library/jest-dom` para Vitest
- `tests/login.spec.ts`, `tests/kanban.spec.ts`, `tests/persistence.spec.ts` - specs e2e de Playwright

## Cómo funciona el tablero

`useBoard()` (`src/hooks/useBoard.ts`) hace `fetch` a `GET /api/board` al montar y guarda el resultado en estado local (`useState`), normalizado igual que antes (`columns` con `cardIds` + mapa `cards`). Cada acción del usuario actualiza el estado local (para que la UI responda al instante, sobre todo el drag-and-drop) y además llama al endpoint correspondiente del backend para persistir:
- Mover una tarjeta: se recalcula el nuevo orden con la función pura `moveCard` (`src/lib/kanban.ts`), y el índice resultante de la tarjeta en su columna destino es lo que se manda como `position` a `POST /api/cards/{id}/move`.
- Agregar tarjeta: se llama primero a `POST /api/cards` (el id real lo asigna el backend) y recién con la respuesta se actualiza el estado local.
- Eliminar tarjeta: `DELETE /api/cards/{id}`, y si resuelve bien se actualiza el estado local.
- Renombrar columna: el input actualiza el estado local en cada tecla (`onRename`), pero solo persiste con `PATCH /api/columns/{id}` en el `onBlur` (`onRenameCommit`) para no mandar un request por letra.

Si falla alguna llamada a la API, `useBoard` guarda un mensaje en `error` (no revierte el cambio optimista - mantenido simple para el MVP).

Drag-and-drop con `@dnd-kit`: `KanbanBoard` define el `DndContext` (sensor de puntero, detección de colisión `closestCorners`); cada columna es una zona `useDroppable` que envuelve un `SortableContext`; cada tarjeta usa `useSortable`; mientras se arrastra, un `DragOverlay` muestra `KanbanCardPreview`.

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

## Pendiente para partes siguientes del plan

- Widget de chat con IA en la barra lateral (Parte 10)
