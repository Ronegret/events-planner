# Roadmap de produccion Events Planner

## Decision tomada

Usaremos Supabase como base real porque encaja mejor con Events Planner:

- Datos relacionales: bodas, invitados, mesas, tareas, equipo y proveedores.
- Roles claros: owner, admin, coordinator y assistant.
- Seguridad por boda con Row Level Security.
- Documentos privados con Storage.
- Menos complejidad que montar backend propio.

## Fase 1. Base real

- Crear proyecto Supabase.
- Ejecutar migraciones.
- Crear usuarios reales.
- Migrar login desde demo local a Supabase Auth.
- Conectar CRUD de bodas, equipo, invitados, mesas, proveedores, documentos y transportes.

## Fase 2. App entregable

- Pasar la app a Next.js + TypeScript.
- Usar Supabase Auth SSR.
- Crear formularios con validacion.
- Sustituir `localStorage` por consultas reales.
- Mantener UI limpia sin textos tecnicos.

## Fase 3. Portal novios

- Crear acceso seguro por boda.
- Definir que puede ver o editar cada pareja.
- Separar documentos internos y documentos visibles para novios.
- Añadir historial de cambios importantes.

## Fase 4. Operacion

- Backups.
- Revision mensual de usuarios.
- Politica de eliminacion y archivo.
- Manual corto para el equipo.
- Pruebas antes de cada boda.
