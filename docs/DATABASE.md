# Base de datos

Esquema propuesto para el tablero Kanban, guardado en [`docs/db-schema.json`](./db-schema.json). SQLite, sin ORM decidido todavía (se define en la Parte 6).

## Relaciones

```
users (1) --- (N) columns (1) --- (N) cards
```

Un usuario tiene varias columnas (su único tablero); una columna tiene varias tarjetas.

## Tablas

- **users**: `id` (PK autoincremental), `username` (único). No guarda contraseña: el login del MVP (Parte 4) está hardcodeado en el frontend y no consulta la base de datos. Esta tabla existe para poder asociar `user_id` a las columnas y así soportar múltiples usuarios en el futuro, según lo indicado en el CLAUDE.md raíz.
- **columns**: `id` (TEXT, PK), `user_id` (FK a `users.id`), `title`, `position` (orden de la columna en el tablero).
- **cards**: `id` (TEXT, PK), `column_id` (FK a `columns.id`), `title`, `details`, `position` (orden de la tarjeta dentro de la columna).

## Decisiones de diseño

- **No hay tabla `boards`**: el MVP pide "1 tablero por usuario", nada más. Ese tablero es implícitamente "todas las columnas de ese `user_id`". Agregar una entidad `boards` hoy sería diseñar para un requisito (múltiples tableros) que no está pedido.
- **Ids de `columns`/`cards` como TEXT, no autoincrementales**: el frontend (`frontend/src/lib/kanban.ts`) ya genera y maneja ids como strings con prefijo (`col-backlog`, `card-1`, `createId()`). Usar el mismo tipo de id en la base de datos evita tener que remapear ids entre frontend y backend cuando se conecten en la Parte 7.
- **Campo `position`**: el frontend ordena las tarjetas de una columna con el array `cardIds`. En SQL no hay orden implícito de filas, así que `position` (entero) hace explícito ese orden y permite reordenar con `UPDATE`.
- **`ON DELETE CASCADE`** en ambas foreign keys: borrar un usuario borra sus columnas, borrar una columna borra sus tarjetas. Evita quedar con filas huérfanas sin agregar lógica de limpieza manual.
- **Datos semilla** (`seed_data` en el JSON): un usuario (`user`) con las mismas 5 columnas y 8 tarjetas que hoy están hardcodeadas en `initialData` (`frontend/src/lib/kanban.ts`). Así, cuando el backend (Parte 6) cree la base de datos por primera vez, el demo que ve el usuario es idéntico al que ya conoce del frontend.
