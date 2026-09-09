# ADR 002 — Stack Tecnológico

**Proyecto:** EstibaX  
**Estado:** Aceptado  
**Fecha:** 2026-08-27

## Contexto

EstibaX requiere una plataforma empresarial, mantenible, type-safe y con buena experiencia de desarrollo. Se prioriza un ecosistema TypeScript unificado entre backend y frontend.

## Decisión

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Backend | NestJS 10 + TypeScript 5 | Framework estructurado, inyección de dependencias, modularidad, alineado con la recomendación del Prompt Maestro. |
| Frontend | React 18 + Vite 5 + TypeScript 5 | Rendimiento de build, hot reload rápido, ecosistema maduro. |
| Estilos | Tailwind CSS 3 | Utilidades consistentes, responsive, fácil de mantener para Enterprise Premium. |
| Base de datos | PostgreSQL + Prisma | Relacional, transaccional, ORM type-safe con migraciones (Fase 2). |
| Tests | Jest + Supertest (backend), Vitest/Jest (frontend) | Estándar de la industria. |
| PWA | Service worker manual + manifest | Control total sobre cache y comportamiento offline básico. |

## Consecuencias

- Desarrollo unificado en TypeScript.
- Escalabilidad y mantenibilidad garantizadas.
- Prisma se introduce en la Fase 2 para no bloquear la configuración inicial.

## Notas

Las dependencias de autenticación (Passport, JWT, bcryptjs), validación (class-validator) y documentación (Swagger) se agregarán progresivamente en fases posteriores.
