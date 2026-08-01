# Revisión de código

Fecha: 2026-08-01. Alcance: todo el repo (backend FastAPI, frontend Next.js, scripts, Docker, docs).

## Qué se verificó

- `uv run pytest` en `backend/` → **24 passed, 1 warning** (StarletteDeprecationWarning por `httpx` en `starlette.testclient`).
- `npm run test:unit` en `frontend/` → **17 passed**.
- `npm run lint` en `frontend/` → **FALLA (1 error)**.
- Revisión manual de `routes.py`, `ai_routes.py`, `ai.py`, `database.py`, `schemas.py`, hooks y componentes del frontend, specs e2e, Dockerfile/compose, scripts y `.gitignore`.

Veredicto general: el código es limpio, simple y bien documentado; la separación de responsabilidades y las pruebas son sólidas para un MVP. Se detectan dos bloqueantes (lint rojo y e2e por defecto insostenible) y varias mejoras de robustez. Los hallazgos se listan por severidad.

## Altos

### 1. `npm run lint` falla en `useAuth.ts`

- **Evidencia:** `src/hooks/useAuth.ts:10` dispara `react-hooks/set-state-in-effect` (ESLint, React 19).
- **Causa raíz:** `useAuth` lee `localStorage` dentro de un `useEffect` y llama `setIsAuthenticated` sincrónicamente en el cuerpo del efecto. La regla nueva de React prohíbe ese patrón.
- **Cuidado con la "solución obvia":** inicializar el estado con lazy initializer (`useState(() => localStorage.getItem(...) === "true")`) rompería la hidratación del export estático: `out/index.html` se genera con el formulario de login (server render con `false`), y el primer render del cliente leería `true` → mismatch.
- **Fix recomendado (idiomático y sin flash de login):** usar `useSyncExternalStore` con `getServerSnapshot: () => false`. `subscribe` solo corre en el cliente y React re-renderiza tras la hidratación si el snapshot difiere del server, eliminando además el destello del formulario al refrescar.

### 2. `npm run test:e2e` por defecto no puede pasar

- **Evidencia:** `playwright.config.ts:15-22` levanta `next dev` en `:3000` cuando no hay `E2E_BASE_URL`, pero `tests/login.spec.ts`, `tests/kanban.spec.ts` y `tests/persistence.spec.ts` requieren el backend real (`/api/board`, drag-and-drop persistente). Sin backend el tablero entra en estado de error (`useBoard` falla) y las assertions fallan. La suite solo funciona vía `E2E_BASE_URL=http://localhost:8000` contra el contenedor.
- **Causa raíz:** la config por defecto asume un backend que el `webServer` no levanta; la limitación está documentada en `frontend/CLAUDE.md` pero el script `npm run test:e2e` sigue existiendo como si fuera autónomo.
- **Fix recomendado:** o bien exigir `E2E_BASE_URL` (fallar temprano con mensaje claro), o eliminar/renombrar el script por defecto y dejar explícito que la suite e2e corre contra Docker.

## Medios

### 3. Artefactos de build versionados en git

- `backend/static/` (44 archivos del export de Next.js) está en el repo, contradiciendo `backend/CLAUDE.md` ("No se edita a mano ni se versiona").
- `frontend/test-results/.last-run.json` (salida de Playwright) también está versionado.
- **Riesgo:** al correr el backend sin Docker se sirve un `static/` obsoleto si no se recompila; y `.last-run.json` ensucia el diff.
- **Fix:** añadir `backend/static/` al `.gitignore` raíz, `test-results/`/`playwright-report/` al `.gitignore` del frontend, y eliminar del índice.

### 4. Directorio accidental `backend;C/`

- Carpetilla vacía en la raíz con un `;` en el nombre (artefacto de un shell). Debe borrarse.

### 5. Sin validación de rango de `position` en el backend

- **Evidencia:** `routes.py:93-112` (`_apply_card_move`) acepta cualquier entero. `POST /api/cards/{id}/move` con `position: 100` en una columna de 2 tarjetas deja posiciones no contiguas (huecos). El frontend manda índices válidos, pero la IA (Parte 9) puede proponer valores inválidos y no hay clamp.
- **Fix:** validar `0 <= position <= número de tarjetas de la columna destino` (o clamp) antes de las dos `UPDATE` de reacomodo, tanto en `routes.py` como en `_apply_action` de `ai_routes.py` (ya validado por `HTTPException`/`ValueError`, pero conviene chequear el rango).
- Nota: la lógica de `_apply_card_move` es correcta (verificado con casos mismo-columna y entre columnas), pero es sutil: merece un comentario y un test de límites.

### 6. Concurrencia SQLite sin protecciones

- **Evidencia:** `database.py:53-59` usa `check_same_thread=False` sin `PRAGMA busy_timeout` ni `journal_mode = WAL`. FastAPI ejecuta los handlers sync en threadpool, así que dos escrituras concurrentes pueden lanzar "database is locked".
- Para el MVP mono-usuario es aceptable, pero `PRAGMA busy_timeout = 5000` (y opcionalmente WAL) es barato y evita sorpresas cuando haya múltiples usuarios.

## Bajos

- **`ai.py:33-47` y `ai.py:50-70` duplican el cliente httpx** (`ask_ai` vs `ask_ai_chat`). Podría extraerse un helper común. Menor.
- **`schemas.py:30-32` `CardUpdate`** permite PATCH con `title=None` y `details=None` → no-op silencioso. Considerar "al menos un campo".
- **`api.ts:22-37`** envía `Content-Type: application/json` también en GET (innecesario). Menor.
- **Historial de chat sin límite:** `useChat.ts` acumula todo el historial y el backend lo reenvía íntegro; conversaciones largas pueden exceder el contexto del modelo (timeout 30s en `ai.py`). Truncar/resumir queda post-MVP.
- **Cambios optimistas sin revertir** en `useBoard.ts` (documentado en CLAUDE.md): si una acción falla, el estado local diverge de la BD. Aceptable para MVP; conviene un refetch o revert en el futuro.
- **`ChatSidebar` usa `key={index}`** para los mensajes (`ChatSidebar.tsx:49`): funciona, pero ids estables serían más robustos ante ediciones.
- **`scripts/start.bat:1` y `stop.bat:1`**: `rem @echo off` es un comentario, no desactiva el echo (debería ser `@echo off`). Funcional pero verboso.
- **`Dockerfile:14`** usa `ghcr.io/astral-sh/uv:latest` (no reproducible). Fijar una versión.
- **`layout.tsx:5-13`** `next/font/google` requiere red durante el build; un build offline en Docker fallaría. Menor.
- **`test_ai.py`** usa `FakeAsyncClient.calls` como atributo de clase (estado compartido entre tests, reseteado a mano). Frágil, considerar instancia por test.
- **`main.py:35`** monta `StaticFiles` en `/` al final; cualquier ruta nueva agregada después quedaría sombreada por el mount. Mantener el orden actual como convención.

## Observaciones positivas

- Los secretos están bien manejados: `OPENROUTER_API_KEY` solo vive en `.env` (gitignored) y en el proceso del backend; no se expone al frontend.
- Las acciones de la IA se aplican dentro de una transacción con `rollback()` total si alguna falla (`ai_routes.py:76-83`) y el parseo tolerante de la salida está bien resuelto para el modelo `gpt-oss-20b:free`.
- El esquema de BD y la normalización frontend/backend (BoardData vs API) están consistentes con `docs/db-schema.json` y `docs/DATABASE.md`.
- Suite pytest con fixtures limpios (`conftest.py` con BD temporal por test) y tests unitarios de componentes correctos.
- Buena separación entre `api.ts` (cliente), `useBoard` (estado+persistencia) y `moveCard` pura en `kanban.ts`.
