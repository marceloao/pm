# Base de datos

Esquema del tablero Kanban, guardado en [`docs/db-schema.json`](./db-schema.json). SQLite, sin ORM (acceso directo con `sqlite3` en `backend/app/database.py`).

Este documento refleja el esquema vigente desde la Parte 13 (multi-tablero + niveles de usuario). El diseño original del MVP (1 tablero por usuario, sin tabla `boards`, sin `role`) queda documentado en la sección "Historial" al final.

## Relaciones

```
users (1) --- (N) sessions
users (1) --- (N) boards (1) --- (N) columns (1) --- (N) cards
```

Un usuario tiene varios tableros; un tablero tiene varias columnas; una columna tiene varias tarjetas.

## Tablas

- **users**: `id` (PK autoincremental), `username` (único), `password_hash` (bcrypt, nunca texto plano), `role` (`admin` | `basico`, default `basico`).
- **sessions**: `id` (TEXT, PK; es el valor de la cookie `session_id`), `user_id` (FK a `users.id`), `created_at`.
- **boards**: `id` (TEXT, PK), `user_id` (FK a `users.id`), `name`, `position` (orden del tablero en el selector).
- **columns**: `id` (TEXT, PK), `board_id` (FK a `boards.id`), `title`, `position` (orden de la columna en el tablero).
- **cards**: `id` (TEXT, PK), `column_id` (FK a `columns.id`), `title`, `details`, `position` (orden de la tarjeta dentro de la columna).

## Decisiones de diseño

- **Ids de `boards`/`columns`/`cards` como TEXT, no autoincrementales**: el frontend ya genera y maneja ids como strings con prefijo (`col-backlog`, `card-1`, `board-xxxxxxxx`). Usar el mismo tipo de id en la base de datos evita remapear ids entre frontend y backend.
- **Campo `position`**: no hay orden implícito de filas en SQL, así que `position` (entero) hace explícito el orden de tableros/columnas/tarjetas y permite reordenar con `UPDATE`.
- **`ON DELETE CASCADE`** en todas las foreign keys: borrar un usuario borra sus sesiones/tableros; borrar un tablero borra sus columnas; borrar una columna borra sus tarjetas. Evita filas huérfanas sin lógica de limpieza manual.
- **No se puede borrar el único tablero de un usuario**: el endpoint `DELETE /api/boards/{id}` devuelve `400` si es el último, para que un usuario nunca quede sin ningún tablero.
- **Migración automática desde el esquema del MVP**: `backend/app/database.py::_migrate_columns_to_boards` detecta bases de datos creadas antes de la Parte 12 (columnas con `user_id` directo, sin `board_id`) y las migra sin perder datos: crea un tablero `"Mi tablero"` por cada usuario existente y reasigna sus columnas a ese tablero.
- **Un solo usuario semilla `admin`**: `role = admin` no se puede autorregistrar (`POST /api/auth/register` siempre asigna `basico`); el único punto de entrada para un nuevo admin es que un admin existente cambie el `role` de otro usuario desde `/api/admin/users/{id}`. Nunca se permite dejar el sistema sin ningún admin (ver más abajo).
- **No se puede degradar ni eliminar al último admin**: tanto `PATCH /api/admin/users/{id}` (bajar `role` a `basico`) como `DELETE /api/admin/users/{id}` devuelven `400` si el usuario objetivo es el único con `role = admin`.
- **Datos semilla** (`seed_data` en el JSON): un usuario `user`/`password` (`role = basico`) con un tablero `"Mi tablero"` (mismas 5 columnas y 8 tarjetas que `initialData` en `frontend/src/lib/kanban.ts`), y un usuario `admin`/`admin` (`role = admin`) con su propio tablero vacío. Un usuario nuevo registrado recibe un tablero con las mismas 5 columnas, sin tarjetas, y `role = basico`.

## Historial (esquema del MVP, Partes 1-10)

Antes de la Parte 11 no existían `password_hash` ni `sessions` (login hardcodeado, sin backend). Antes de la Parte 12 no existía la tabla `boards`: cada fila de `columns` tenía un `user_id` directo (FK a `users.id`), y el "tablero" de un usuario era implícitamente todas sus columnas. Antes de la Parte 13 no existía `role` (no había niveles de usuario ni módulo de administración). Ver el historial de commits para el detalle exacto de esos esquemas.
