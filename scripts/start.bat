rem @echo off
cd /d "%~dp0.."
docker compose up --build -d
echo Backend disponible en http://localhost:8000
