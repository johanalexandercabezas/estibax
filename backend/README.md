# EstibaX Backend

API REST desarrollada con NestJS 10 y TypeScript 5.

## Scripts

```bash
npm run start:dev    # Desarrollo con hot reload (ts-node-dev)
npm run start        # Iniciar con ts-node
npm run build        # Compilar con tsc
npm run start:prod   # Ejecutar build compilado
npm run test         # Pruebas unitarias
npm run test:e2e     # Pruebas end-to-end
npm run test:cov     # Cobertura
npm run lint         # ESLint
npm run format       # Prettier
```

## Estructura

```text
src/
├── main.ts              # Punto de entrada
├── app.module.ts        # Módulo raíz
├── app.controller.ts    # Controlador base (health check)
└── app.service.ts       # Servicio base

test/
└── app.e2e-spec.ts      # Pruebas E2E
```

## Configuración

Copiar `.env.example` a `.env` y ajustar:

```text
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@localhost:5432/estibax
JWT_SECRET=change-me-in-production
```

## Estado

Fase 1 completada: proyecto configurado, servidor funcional, tests unitarios y E2E pasando.

Las dependencias de autenticación (Passport/JWT), validación (class-validator), documentación (Swagger) y Prisma se integrarán en fases posteriores.
