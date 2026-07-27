# Scripts

Scripts de inicio y parada del contenedor Docker del proyecto (usan `docker compose`, definido en `docker-compose.yml` en la raíz).

- `start.sh` / `start.bat` - construye la imagen y levanta el backend en segundo plano (`docker compose up --build -d`), disponible en `http://localhost:8000`
- `stop.sh` / `stop.bat` - detiene y elimina el contenedor (`docker compose down`)

Usar `.sh` en Mac/Linux y `.bat` en Windows.
