# Backend

FastAPI mínimo, gestionado con `uv`. Sirve el frontend estático en `/` y expone la API en `/api/*`.

## Estructura

- `pyproject.toml` - dependencias (`fastapi`, `uvicorn`) y grupo `dev` (`pytest`, `httpx`) para tests
- `app/main.py` - instancia FastAPI, `lifespan` que inicializa la base de datos al arrancar, incluye el router de la API, monta `static/` en `/`
- `app/database.py` - conexión SQLite, esquema (`CREATE TABLE IF NOT EXISTS`) y datos semilla (usuario + 5 columnas + 8 tarjetas, igual a `initialData` del frontend). Ver el diseño completo en `docs/db-schema.json` y `docs/DATABASE.md`.
- `app/schemas.py` - modelos Pydantic de request/response
- `app/routes.py` - endpoints de la API (`/api/board`, `/api/cards`, `/api/columns`)
- `tests/` - suite pytest (`conftest.py` con el fixture `client`, `test_board.py`)
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
