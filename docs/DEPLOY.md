# Despliegue en producción (VPS + Docker + Caddy)

Este proyecto corre en Docker (ver `docker-compose.yml`). Para producción se agrega
un servicio `caddy` (perfil `prod`) que actúa como reverse proxy y obtiene un
certificado TLS automático de Let's Encrypt para el dominio configurado.

## Requisitos

- Un VPS con Docker instalado (`docker compose` incluido).
- Un dominio con su registro DNS tipo A apuntando a la IP del VPS.
- Puertos 80 y 443 abiertos en el firewall del VPS.

## Pasos

1. Clonar el repo en el VPS y ubicarse en la raíz del proyecto.
2. Copiar `.env.example` a `.env` y completar:
   ```
   OPENROUTER_API_KEY=tu_clave_real
   DOMAIN=tu-dominio.com
   ```
3. Levantar backend + Caddy con el perfil `prod`:
   ```
   docker compose --profile prod up --build -d
   ```
4. Verificar que `https://tu-dominio.com/` sirve el login del Kanban (Caddy emite el certificado la primera vez que recibe tráfico para el dominio, puede tardar unos segundos).

## Notas

- En desarrollo local (`scripts/start.sh` / `scripts/start.bat`) el servicio `caddy` no se levanta, porque está detrás del perfil `prod` y esos scripts corren `docker compose up` sin perfil. El backend sigue accesible en `http://localhost:8000` como siempre.
- `Caddyfile` (en la raíz) usa la variable de entorno `DOMAIN` (`{$DOMAIN}`) para saber a qué dominio responder.
- Los certificados de Caddy se persisten en los volúmenes `caddy-data`/`caddy-config`, así que sobreviven a un `docker compose down` (sin `-v`).
- Para detener todo: `docker compose --profile prod down`.
