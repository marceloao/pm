# Backend

FastAPI mínimo, gestionado con `uv`. Sirve el frontend estático en `/` y expone la API en `/api/*`.

## Estructura

- `pyproject.toml` - dependencias (`fastapi`, `uvicorn`, `httpx`) y grupo `dev` (`pytest`) para tests
- `app/main.py` - instancia FastAPI, `lifespan` que inicializa la base de datos al arrancar, incluye los routers de la API, monta `static/` en `/`
- `app/database.py` - conexión SQLite, esquema (`CREATE TABLE IF NOT EXISTS`) y datos semilla (usuario + 5 columnas + 8 tarjetas, igual a `initialData` del frontend). Ver el diseño completo en `docs/db-schema.json` y `docs/DATABASE.md`.
- `app/schemas.py` - modelos Pydantic de request/response
- `app/routes.py` - endpoints del tablero (`/api/board`, `/api/cards`, `/api/columns`)
- `app/ai.py` - cliente HTTP hacia OpenRouter (`ask_ai(prompt)`), usando `httpx.AsyncClient` y el modelo `openai/gpt-oss-20b:free`
- `app/ai_routes.py` - endpoints relacionados con la IA (`/api/ai/*`): `/ping` y `/chat` (chat con contexto del tablero + acciones sobre el tablero)
- `tests/` - suite pytest (`conftest.py` con el fixture `client`, `test_board.py`, `test_ai.py`)
- `static/` - build estático del frontend (Next.js con `output: "export"`), servido en `/`. No se edita a mano ni se versiona: lo genera el stage `frontend-build` del `Dockerfile` en cada build de la imagen (`COPY --from=frontend-build /frontend/out ./static`). Para correr el backend localmente sin Docker hay que generarlo antes a mano (`cd frontend && npm run build` y copiar `frontend/out/*` a `backend/static/`).
- `Dockerfile` - build multi-stage: primero compila el frontend (`node:22-slim`) generando el export estático, luego arma la imagen Python (`uv sync` + `uvicorn`) copiando ese resultado a `static/`

## Base de datos

SQLite. Ubicación configurable por `DATABASE_PATH` (default `data/kanban.db`, relativo al `WORKDIR /app`, coincide con el volumen `backend-data:/app/data` de `docker-compose.yml`). Si el archivo no existe, `lifespan` (en `main.py`) crea las tablas y siembra los datos de ejemplo automáticamente al arrancar. El MVP no es multi-tenant todavía: todos los endpoints operan sobre el único usuario sembrado (`user_id = 1`); el login (ver Parte 4) es client-side y no manda ningún token al backend.

## Endpoints

- `GET /` - sirve el tablero Kanban (build estático del frontend)
- `GET /api/hello` - endpoint de prueba, devuelve `{"message": "Hello from the API"}`
- `GET /api/board` - tablero completo (columnas y tarjetas, ordenadas por `position`)
- `POST /api/cards` - crea una tarjeta al final de una columna (`{column_id, title, details}`)
- `PATCH /api/cards/{card_id}` - edita título/detalle de una tarjeta
- `DELETE /api/cards/{card_id}` - elimina una tarjeta
- `POST /api/cards/{card_id}/move` - mueve una tarjeta a `{column_id, position}`, reacomodando el resto de las tarjetas afectadas
- `PATCH /api/columns/{column_id}` - renombra una columna
- `GET /api/ai/ping` - prueba de conectividad con la IA: pregunta "2+2" a OpenRouter y devuelve `{question, answer}`. Responde `502` si la llamada a OpenRouter falla (clave faltante, error de red, etc.)
- `POST /api/ai/chat` - chat con la IA (`{message, history}`, donde `history` es `[{role, content}]`). Devuelve `{reply, board}` con el tablero actual (tras aplicar cambios si los hubo). Responde `502` si la llamada a OpenRouter falla.

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
