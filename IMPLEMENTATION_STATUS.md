# Events Planner - Implementation Status

Ultima actualizacion: 2026-10-22

## Estado actual

Events Planner es una herramienta web para planificar bodas y eventos entre un
equipo y las parejas. La version publica es una **demostracion**: todos los datos
(parejas, invitados, proveedores, importes, telefonos, correos) estan inventados
y se guardan solo en el navegador de quien la visita.

El frontend son modulos ES nativos bajo `src/` (`state.js`, `render.js`,
`views.js`, `modals.js`, `portal.js`, `print.js`, `contracts.js`, `payments.js`,
`main.js`...). `npm run build` genera `dist/` con un paquete unico
(`app.bundle.js`) para que funcione tambien abriendolo desde el movil.

## Implementado

- Panel de inicio con lo que necesita atencion hoy: preparacion calculada, dias
  restantes y alertas accionables.
- Bodas, agenda (calendario mensual/lista) y espacio de trabajo por boda:
  timeline, tareas, Wedding Day, invitados, mesas con plano, menus y alergias.
- Proveedores reutilizables, valorables y propuestos a cada pareja; buscador de
  proveedores en la web (`src/buscador-proveedores.js`) apoyado en la Edge Function
  `buscar-proveedores`, con la clave de Google solo en servidor y cache de 14 dias.
- Catalogo de rincones con foto, descripcion y seguimiento de compra.
- Presupuesto por partidas y plazos, con parte facturada y no facturada, pagos y
  comprobantes.
- Contrato imprimible a partir de los servicios contratados, con firma dibujada o
  marcado como firmado en papel.
- Portal privado para cada pareja: solo ve su boda, nunca notas internas ni datos
  del equipo. Las parejas pueden tener tareas asignadas.
- Centro de exportacion con seleccion de contenido y destinatario (equipo,
  parejas, proveedores); dossier imprimible con portada y paleta de la boda.
- Navegacion adaptada: barra lateral, barra de tablet y barra inferior en movil;
  iconos SVG; guia inicial de tres pasos; acciones accesibles para lectores de pantalla.
- Funciona en movil, tablet y escritorio; se instala como app y abre sin conexion
  (service worker con red primero).
- Base Supabase preparada: migraciones versionadas (`supabase/migrations/`),
  RLS en todas las tablas expuestas, Storage privado (`ep-documents`), estado
  compartido con control de concurrencia y realtime, y puente relacional para
  bodas y tareas con auditoria de servidor (actor y datos before/after).
- Suite pgTAP de 15 pruebas para sincronizacion, estados, responsables,
  auditoria, borrado logico y aislamiento por membresia
  (`supabase/tests/database/`).
- Escapado HTML sistematico en filas de datos para cerrar XSS almacenado.

## Version de demostracion (portfolio)

- Tres bodas inventadas y completas, generadas con semilla fija
  (`npm run seed:portfolio`). Sus fechas se desplazan al cargar para que la demo
  no envejezca, y la demo se rehace cada semana.
- Un solo acceso: `admin` / `admin`. Clave del portal de parejas: `demo2026`.
- `app-config.js` sin credenciales: la app funciona entera contra el navegador y
  no toca ninguna nube.
- Franja de demostracion fija en todas las pantallas.
- `scripts/comprobar-privacidad.py` revisa el paquete (texto, imagenes
  incrustadas y telefonos en cualquier formato) antes de publicar. Debe salir limpio.
  Detalle en `docs/PORTFOLIO.md`.

## No implementado aun

- Migracion completa de los modulos restantes a tablas relacionales dedicadas.
  Bodas y tareas ya se reflejan en tablas protegidas, pero `app_state` sigue como
  origen compatible.
- URLs firmadas para documentos privados.
- Auditoria fuerte y borrado logico para los modulos restantes.
- Exportaciones PDF generadas en servidor, ademas de DOCX/XLSX; hoy el dossier
  usa la impresion PDF del navegador.
- Pasarela de pago real (lo actual es aviso + comprobante).
- Firma electronica cualificada (la actual es un dibujo en canvas).
- Cola de cambios offline con reintento y resolucion de conflictos.
- i18n es/ca/en.
- Tests unitarios de frontend, integracion completa y E2E.
- CI/CD, backups y restauracion.

## Riesgo principal

La version sincroniza datos con Supabase usando una tabla puente JSON para ganar
velocidad. Antes de manejar datos sensibles reales conviene completar URLs
firmadas, auditoria fuerte y la migracion modulo a modulo a tablas relacionales.

## Proxima fase recomendada

Crear el proyecto Supabase propio, aplicar las migraciones y convertir
invitados, mesas y asignaciones en el siguiente bloque relacional antes de
migrar documentos, proveedores y el portal.
