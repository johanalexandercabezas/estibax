# Guía de Despliegue — EstibaX

## 1. Requisitos

| Componente | Versión | Nota |
|---|---|---|
| Node.js | ≥ 20 LTS | Probado con v24 |
| PostgreSQL | 16 o 18 | Local, Docker o servicio Windows |
| npm | ≥ 10 | |

## 2. Estructura del monorepo

```
EstibaX/
├── backend/    # API NestJS 10 + Prisma 5 + PostgreSQL
├── frontend/   # React 18 + Vite 5 + Tailwind 3 (PWA)
├── docs/       # ADRs, manual de usuario, esta guía
└── INICIAR-ESTIBAX.cmd   # arranque con un clic (Windows)
```

## 3. Instalación

```bash
# Backend
cd backend
npm install
cp .env.example .env        # ajusta DATABASE_URL y JWT_SECRET

# Frontend
cd ../frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:3000
```

## 4. Base de datos

```bash
cd backend
npx prisma migrate deploy   # aplica las 5 migraciones
npx prisma db seed          # datos demo (empresa, clientes, 14 activos, roles, usuarios)
```

`DATABASE_URL` de ejemplo: `postgresql://estibax@localhost:5433/estibax`

## 5. Ejecución

### Opción A — un clic (Windows)
Doble clic en `INICIAR-ESTIBAX.cmd`: levanta PostgreSQL, backend (puerto 3000) y frontend (puerto 5173). Es idempotente: no duplica servicios ya activos.

### Opción B — manual

```bash
# 1. PostgreSQL (si no es un servicio)
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D backend\.pgdata -o "-p 5433" start

# 2. Backend (compila y sirve)
cd backend && npm run build && node dist/main.js

# 3. Frontend de producción (servidor estático, estable)
cd frontend && npm run build && node servir-frontend.cjs
```

Verificación: `GET http://localhost:3000/health` → `{"status":"ok"}` · Swagger: `http://localhost:3000/api/docs`

## 6. Puesta en producción (recomendaciones)

1. **Secretos**: define `JWT_SECRET` fuerte (32+ caracteres) en variables de entorno del servidor, nunca en el repositorio. Rota periódicamente.
2. **Base de datos**: usuario dedicado con contraseña, backups diarios (`pg_dump`), y `sslmode=require` si es remota.
3. **HTTPS**: pon Nginx/Caddy frente a backend y frontend; sirve el frontend desde `frontend/dist` con fallback SPA.
4. **Frontend**: tras cualquier cambio de código ejecutar `npm run build` y reiniciar `servir-frontend.cjs`.
5. **Logs**: el backend loguea a consola; en producción redirige a archivo o usa un colector.
6. **Migraciones**: en CI/CD ejecutar `npx prisma migrate deploy` antes de arrancar el backend. Nunca editar migraciones ya aplicadas.

## 7. Solución de problemas de infraestructura

| Síntoma | Causa | Solución |
|---|---|---|
| `pg_ctl: no se pudo iniciar` + `Permission denied` en bind | Puerto ocupado transitoriamente o `postmaster.pid` obsoleto | Borrar `backend\.pgdata\postmaster.pid` y reintentar; esperar la recuperación WAL (`pg_isready` en bucle) |
| Backend arranca pero `/health/db` falla | BD caída o URL mal configurada | Levantar PostgreSQL y revisar `backend\.env` |
| Página en blanco en 5173 | Servidor estático detenido o build desactualizado | `cd frontend && npm run build` y relanzar `servir-frontend.cjs` |
| 401 en todas las llamadas | `JWT_SECRET` distinto entre sesiones | Fijar `JWT_SECRET` estable en `.env` |
