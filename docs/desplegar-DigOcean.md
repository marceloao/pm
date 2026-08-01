# Despliegue en Digital Ocean

Procedimiento para desplegar este proyecto en una VM (droplet) de Digital Ocean corriendo Linux, usando Docker Compose con Caddy como reverse proxy y HTTPS automático.

Requisito previo: cuenta de Digital Ocean con un droplet Linux ya creado.

## 1. Preparar el droplet

Conectarse por SSH:

```
ssh root@<ip-droplet>
```

Instalar Docker y el plugin compose (si no están instalados):

```
curl -fsSL https://get.docker.com | sh
```

Verificar:

```
docker compose version
```

## 2. DNS

Crear un registro A en el proveedor de dominio apuntando el dominio (o subdominio) a la IP pública del droplet. Caddy necesita esto para emitir el certificado TLS automáticamente vía Let's Encrypt.

Si no hay dominio propio disponible, se puede usar la IP directamente, pero en ese caso Caddy no podrá emitir HTTPS. La alternativa sería exponer el backend sin el perfil `prod` de Caddy, sirviendo solo HTTP en el puerto 8000.

## 3. Llevar el código al droplet

Opción simple: `git clone` del repo directamente en el droplet (requiere el repo en un remoto como GitHub).

Alternativa: `scp`/`rsync` del directorio local si no se usa un remoto git.

## 4. Configurar `.env` en el droplet

Copiar `.env.example` a `.env` y completarlo:

```
OPENROUTER_API_KEY=   # clave real de OpenRouter
DOMAIN=               # dominio, ej. proyecto.tudominio.com (usado por Caddy para el certificado)
```

## 5. Firewall

Abrir los puertos 80 y 443 (y 22 para SSH) en el firewall de Digital Ocean (Networking → Firewalls) o con:

```
ufw allow 80,443,22/tcp
```

## 6. Levantar los contenedores

```
docker compose --profile prod up -d --build
```

Esto construye el backend (que sirve el frontend estático) y levanta Caddy como reverse proxy con TLS automático.

## 7. Verificar

- `docker compose ps` para confirmar que ambos servicios están corriendo.
- Visitar `https://tudominio.com` y probar login, tablero y chat con IA.
- `docker compose logs -f caddy` si el certificado tarda en emitirse (puede tomar uno o dos minutos la primera vez).

## 8. Persistencia

La base de datos SQLite vive en el volumen `backend-data`, por lo que sobrevive a reinicios y actualizaciones del contenedor.

## Actualizaciones futuras

```
git pull && docker compose --profile prod up -d --build
```
