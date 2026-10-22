# Events Planner - Implementation Plan

## Fase 1 - Base de produccion

- Crear app Next.js con TypeScript estricto.
- Migrar el sistema visual actual a componentes.
- Configurar Supabase Auth, PostgreSQL y Storage.
- Crear migraciones versionadas.
- Activar RLS desde el primer dia.
- Crear `.env.example`.

## Fase 2 - Core seguro de bodas

- Usuarios y perfiles.
- Roles y permisos.
- CRUD de bodas.
- Equipo asignado por boda.
- Actividad append-only.
- Dashboard con datos reales.

## Fase 3 - Portal de novios

- Enlace privado por boda.
- PIN/contrasena con hash.
- Scope exclusivo de una boda.
- Invitados, alergias, mesas y preferencias.
- Bloqueo de edicion por el equipo.

## Fase 4 - Wedding Day

- Timeline con estados.
- Checks con actor y hora de servidor.
- Cuenta atras y retrasos.
- Realtime.
- Cache/offline limitado.

## Fase 5 - Operacion completa

- Proveedores reutilizables.
- Transportes y pasajeros.
- Musica.
- Documentos con Storage privado.
- Notas y secciones personalizadas.

## Fase 6 - Exportaciones y calidad

- PDF de boda.
- DOCX/Word de timing.
- XLSX/CSV de invitados, mesas y transportes.
- Pruebas criticas.
- PWA.
- i18n es/ca/en.

## Fase 7 - Produccion

- Backups diarios.
- Copia externa cifrada.
- Observabilidad.
- Runbook de incidentes.
- Hardening de seguridad.
