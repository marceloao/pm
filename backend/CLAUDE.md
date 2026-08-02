# Backend

FastAPI mínimo, gestionado con `uv`. Sirve el frontend estático en `/` y expone la API en `/api/*`.

## Estructura

- `pyproject.toml` - dependencias (`fastapi`, `uvicorn`, `httpx`, `bcrypt`) y grupo `dev` (`pytest`) para tests
- `app/main.py` - instancia FastAPI, `lifespan` que inicializa la base de datos al arrancar, incluye los routers de la API, monta `static/` en `/`
- `app/database.py` - conexión SQLite, esquema (`CREATE TABLE IF NOT EXISTS`) y datos semilla (usuario `user`/`password` + 5 columnas + 8 tarjetas, igual a `initialData` del frontend). Ver el diseño completo en `docs/db-schema.json` y `docs/DATABASE.md`.
- `app/schemas.py` - modelos Pydantic de request/response
- `app/auth.py` - hashing de contraseñas (`bcrypt`), creación/borrado de sesiones (tabla `sessions`), la dependencia `get_current_user_id` (lee la cookie `session_id`, 401 si no hay sesión válida) y `require_admin` (403 si el usuario autenticado no tiene `role = admin`)
- `app/auth_routes.py` - endpoints de autenticación (`/api/auth/*`): registro (siempre crea usuarios `role = basico`), login, logout, `me` (incluye `role`), `change-password`
- `app/admin_routes.py` - endpoints de administración (`/api/admin/*`), todos protegidos por `require_admin`: listar usuarios, crear usuario (con `role`), cambiar `role`/resetear contraseña, eliminar usuario. Impide dejar el sistema sin ningún `admin` (degradar o borrar al último admin devuelve `400`)
- `app/routes.py` - endpoints de tableros (`/api/boards`), columnas y tarjetas (`/api/cards`, `/api/columns`); todos requieren sesión. Un usuario puede tener varios tableros (`boards`); la propiedad de columnas/tarjetas se verifica vía `boards.user_id` (join columns->boards, cards->columns->boards)
- `app/ai.py` - cliente HTTP hacia OpenRouter (`ask_ai(prompt)`), usando `httpx.AsyncClient` y el modelo `openai/gpt-oss-20b:free`
- `app/ai_routes.py` - endpoints relacionados con la IA (`/api/ai/*`): `/ping` (sin auth) y `/chat` (requiere sesión; chat con contexto del tablero del usuario autenticado + acciones sobre ese tablero)
- `tests/` - suite pytest (`conftest.py` con los fixtures `anon_client` sin sesión, `client` ya logueado como el usuario semilla `user` (`role = basico`), `admin_client` ya logueado como `admin`/`admin`, y `other_client` (segunda cookie jar sobre la misma BD, para probar aislamiento entre usuarios); `test_board.py`, `test_ai.py`, `test_auth.py`, `test_boards.py`, `test_users.py`)
- `static/` - build estático del frontend (Next.js con `output: "export"`), servido en `/`. No se edita a mano ni se versiona: lo genera el stage `frontend-build` del `Dockerfile` en cada build de la imagen (`COPY --from=frontend-build /frontend/out ./static`). Para correr el backend localmente sin Docker hay que generarlo antes a mano (`cd frontend && npm run build` y copiar `frontend/out/*` a `backend/static/`).
- `Dockerfile` - build multi-stage: primero compila el frontend (`node:22-slim`) generando el export estático, luego arma la imagen Python (`uv sync` + `uvicorn`) copiando ese resultado a `static/`

## Base de datos

SQLite. Ubicación configurable por `DATABASE_PATH` (default `data/kanban.db`, relativo al `WORKDIR /app`, coincide con el volumen `backend-data:/app/data` de `docker-compose.yml`). Si el archivo no existe, `lifespan` (en `main.py`) crea las tablas y siembra los datos de ejemplo automáticamente al arrancar: usuario `user`/`password` (`role = basico`) con un tablero "Mi tablero" de 5 columnas y 8 tarjetas, y usuario `admin`/`admin` (`role = admin`) con su propio tablero vacío. Un usuario puede tener varios tableros (`boards`, `user_id` + `name` + `position`); cada `columns.board_id` apunta a un tablero, y todos los endpoints de tablero/columnas/tarjetas verifican la propiedad vía `boards.user_id` de la sesión activa (cookie `session_id` -> tabla `sessions` -> `user_id`). Un usuario nuevo (`POST /api/auth/register`) siempre recibe `role = basico` y un tablero "Mi tablero" con 5 columnas vacías. `app/database.py::_migrate_columns_to_boards` migra automáticamente bases de datos creadas antes de la Parte 12 (columnas con `user_id` directo) creando un tablero por defecto por usuario y reasignando sus columnas, sin perder tarjetas; `_ensure_column` agrega `password_hash`/`role` a bases creadas antes de las Partes 11/13.

## Autenticación y niveles de usuario

Sesión basada en cookie httponly (`session_id`), no JWT. `POST /api/auth/register` y `/login` crean una fila en `sessions` y setean la cookie; `POST /api/auth/logout` borra la fila y la cookie. La dependencia `get_current_user_id` (`app/auth.py`) se inyecta en todos los endpoints de tablero/tarjetas/columnas y en `/api/ai/chat`, devolviendo 401 si no hay cookie o la sesión no existe en la BD. Las contraseñas se hashean con `bcrypt` (`app/auth.py::hash_password`/`verify_password`), nunca se guardan en texto plano; `POST /api/auth/change-password` permite a cualquier usuario autenticado cambiar la suya (requiere la contraseña actual correcta).

Cada usuario tiene `role` (`admin` | `basico`). `require_admin` (`app/auth.py`) protege todo `/api/admin/*` (`app/admin_routes.py`) devolviendo 403 a usuarios `basico`. El registro público siempre asigna `basico`; solo un `admin` puede promover a otro usuario a `admin` desde el módulo de administración, y no se permite dejar el sistema sin ningún `admin` (degradar o eliminar al último admin devuelve 400). Sin recuperación de contraseña por email - fuera de alcance (ver `CLAUDE.md` raíz).

## Endpoints

- `GET /` - sirve el tablero Kanban (build estático del frontend)
- `GET /api/hello` - endpoint de prueba, devuelve `{"message": "Hello from the API"}`
- `POST /api/auth/register` - crea un usuario (`{username, password}`), siembra sus columnas por defecto y abre sesión. `409` si el username ya existe.
- `POST /api/auth/login` - abre sesión (`{username, password}`). `401` si las credenciales son inválidas.
- `POST /api/auth/logout` - cierra la sesión actual (borra la cookie y la fila de `sessions`)
- `GET /api/auth/me` - usuario autenticado actual, incluye `role`. `401` sin sesión.
- `POST /api/auth/change-password` - cambia la contraseña del usuario autenticado (`{current_password, new_password}`). `401` si `current_password` no coincide.
- `GET /api/admin/users` - lista todos los usuarios (`{id, username, role}`). Requiere `role = admin`, `403` si no.
- `POST /api/admin/users` - crea un usuario (`{username, password, role}`). `409` si el username ya existe.
- `PATCH /api/admin/users/{user_id}` - cambia `role` y/o resetea `password` de un usuario. `400` si intenta degradar al último admin restante.
- `DELETE /api/admin/users/{user_id}` - elimina un usuario. `400` si es el último admin restante.
- `GET /api/boards` - lista los tableros del usuario autenticado (`{id, name}`, ordenados por `position`). `401` sin sesión.
- `POST /api/boards` - crea un tablero nuevo (`{name}`) con 5 columnas por defecto y sin tarjetas; devuelve el tablero completo
- `GET /api/boards/{board_id}` - tablero completo (`{id, name, columns}`, columnas y tarjetas ordenadas por `position`). `404` si no existe o no pertenece al usuario
- `PATCH /api/boards/{board_id}` - renombra un tablero (`{name}`)
- `DELETE /api/boards/{board_id}` - elimina un tablero y en cascada sus columnas/tarjetas. `400` si es el único tablero del usuario
- `POST /api/cards` - crea una tarjeta al final de una columna del usuario autenticado (`{column_id, title, details}`)
- `PATCH /api/cards/{card_id}` - edita título/detalle de una tarjeta (debe pertenecer al usuario autenticado)
- `DELETE /api/cards/{card_id}` - elimina una tarjeta (debe pertenecer al usuario autenticado)
- `POST /api/cards/{card_id}/move` - mueve una tarjeta a `{column_id, position}`, reacomodando el resto de las tarjetas afectadas
- `PATCH /api/columns/{column_id}` - renombra una columna
- `GET /api/ai/ping` - prueba de conectividad con la IA (sin auth): pregunta "2+2" a OpenRouter y devuelve `{question, answer}`. Responde `502` si la llamada a OpenRouter falla (clave faltante, error de red, etc.)
- `POST /api/ai/chat` - chat con la IA (`{board_id, message, history}`, donde `history` es `[{role, content}]`), requiere sesión. Opera únicamente sobre el tablero `board_id` indicado y devuelve `{reply, board}` con ese tablero actualizado (tras aplicar cambios si los hubo). Responde `502` si la llamada a OpenRouter falla.

## IA (OpenRouter)

`OPENROUTER_API_KEY` viene de `.env` en la raíz (cargado por `env_file` en `docker-compose.yml`) y solo existe en el proceso del backend - nunca se expone al frontend. `app/ai.py` arma el request a `https://openrouter.ai/api/v1/chat/completions` con el modelo `openai/gpt-oss-20b:free`.

Para `/api/ai/chat`, cada llamada envía: el JSON completo del tablero, el historial de la conversación (`history`) y el mensaje del usuario. La IA responde con un único objeto JSON `{reply, actions}`, donde `actions` es una lista de acciones tipadas (`create_card`, `update_card`, `move_card`, `delete_card`, `rename_column`) que reflejan uno a uno los endpoints de `routes.py`. Nota importante: el modelo gratuito `openai/gpt-oss-20b:free` ignora el `response_format: json_schema` de OpenRouter (verificado manualmente contra la API real - devuelve su propio formato ad-hoc); en su lugar, el schema exacto se describe en el prompt del sistema (`CHAT_SYSTEM_PROMPT` en `app/ai.py`) y la respuesta se parsea de forma tolerante en `parse_ai_chat_output` (extrae el primer `{` al último `}` del contenido, ya que el modelo a veces antepone texto suelto). Si el parseo o la validación fallan, se trata como respuesta de solo texto sin acciones. Las acciones se aplican dentro de una transacción SQLite: si cualquiera falla (referencia a tarjeta/columna inexistente, campos faltantes), se hace `rollback()` completo y el tablero queda intacto.

## Tests

No hay Python/uv instalados en el host de desarrollo: los tests se corren dentro de Docker.

```
docker compose run --rm backend sh -c "uv sync --group dev && uv run pytest"
```

## Correr localmente sin Docker

```
cd frontend && npm run build   # genera frontend/out
cp -r frontend/out/* backend/static/
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

## Correr con Docker

Ver `scripts/start.sh` / `scripts/start.bat` en la raíz del proyecto (usan `docker compose`; el build de la imagen ya incluye la compilación del frontend, no hace falta el paso manual de arriba).
