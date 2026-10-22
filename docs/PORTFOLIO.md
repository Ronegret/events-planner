# Version de demostracion (portfolio)

Events Planner se publica como demostracion: la misma aplicacion y las mismas
funciones, con datos inventados y sin conexion a ninguna nube.

## Que hay de verdad y que no

| Pieza | Estado |
|---|---|
| Parejas, invitados, proveedores, importes, telefonos, correos | Inventados (`scripts/gen-seed-portfolio.mjs`, semilla fija) |
| Acceso | `admin` / `admin`; clave del portal de parejas `demo2026` |
| Datos | Solo en el navegador de quien visita; caducan a la semana |
| `app-config.js` | Vacio a proposito: sin `supabaseUrl` la app no intenta conectarse |
| Datos personales y bancarios | Siempre ficticios: DNI `00000000T`, IBAN todo ceros, telefonos `+34 600 000 xxx`, correos `@example.com` |
| Contrato | Plantilla de ejemplo con aviso de demostracion; no es asesoramiento legal |
| Imagenes | Solo las de `assets/`; ninguna con nombres reales ni personas identificables |

## Regenerar los datos

```bash
npm run seed:portfolio   # reescribe src/data/seed-demo.js
npm run build            # genera dist/
```

Las fechas se generan respecto a un «hoy» fijo y se desplazan al cargar, asi que
las tres bodas siempre quedan: una recien empezada, una proxima y una celebrada.

## Antes de publicar

```bash
python scripts/comprobar-privacidad.py <paquete.zip>
```

Revisa el paquete entero (texto, imagenes incrustadas, telefonos en cualquier
formato, archivos temporales) y debe salir limpio. Si encuentra algo, se corrige
en el origen (`src/`, `assets/` o el generador) y se vuelve a compilar; nunca se
edita `dist/` a mano.

## Que no entra nunca en el repositorio

- Claves o secretos (`.env*` esta en `.gitignore`; solo se versiona `.env.example`).
- Copias de datos de uso real, documentos de clientes o fotos de personas.
- Identificadores de proyectos Supabase reales: en la documentacion se usa
  `TU_PROJECT_REF`.
