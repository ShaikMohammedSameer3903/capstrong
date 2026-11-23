@echo off
set "ROOT=D:\Downloads\capstrong-main\capstrong-main"

echo [1/5] Starting containers if stopped...
docker start cloudops-frontend
docker start cloudops-backend

echo [2/5] Copying frontend build...
docker cp "%ROOT%\dist\." cloudops-frontend:/usr/share/nginx/html/

echo [3/5] Copying server code...
docker cp "%ROOT%\server\index.js" cloudops-backend:/app/server/index.js
docker cp "%ROOT%\server\db\." cloudops-backend:/app/server/db/
docker cp "%ROOT%\server\middleware\." cloudops-backend:/app/server/middleware/
docker cp "%ROOT%\server\websockets\." cloudops-backend:/app/server/websockets/
docker cp "%ROOT%\server\providers\." cloudops-backend:/app/server/providers/
docker cp "%ROOT%\server\routes\." cloudops-backend:/app/server/routes/
docker cp "%ROOT%\server\services\." cloudops-backend:/app/server/services/
docker cp "%ROOT%\server\scripts\." cloudops-backend:/app/server/scripts/
docker cp "%ROOT%\.env" cloudops-backend:/app/server/.env

echo [4/5] Reloading NGINX...
docker exec cloudops-frontend nginx -s reload

echo [5/5] Restarting backend...
docker restart cloudops-backend

echo ALL DOCKER CONTAINERS FULLY UPDATED!
