#!/bin/sh
set -e
cd "$(dirname "$0")/.."
docker compose up --build -d
echo "Backend disponible en http://localhost:8000"
