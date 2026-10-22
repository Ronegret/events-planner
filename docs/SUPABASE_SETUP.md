# Configuracion Supabase para Events Planner

Esta guia deja Events Planner preparado para pasar de demo local a sistema real compartido por todo el equipo.

## 1. Crear el proyecto

1. Entra en Supabase y crea un proyecto nuevo.
2. Guarda el `Project URL` y la `publishable key`.
3. No compartas nunca la `service_role key` en frontend ni repositorios publicos.
4. Copia `.env.example` a `.env.local` y completa:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
```

## 2. Ejecutar base de datos

Instala Supabase CLI si no esta en el equipo:

```bash
npm install -g supabase
```

Despues conecta el proyecto:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

Esto crea:

- Usuarios internos con perfiles y roles.
- Bodas y equipo asignado por boda.
- Tareas, timeline, invitados, mesas, proveedores, musica, transportes y documentos.
- Portal privado para novios.
- Storage privado para archivos.
- Seguridad RLS por rol y por pertenencia a cada boda.

## 3. Crear usuarios reales

En Supabase Dashboard:

1. Ve a Authentication.
2. Crea un usuario administrador (`admin`) y otros dos de ejemplo (`persona2`, `persona3`).
3. Copia el UUID de cada usuario.
4. Inserta o actualiza `public.profiles` con esos UUID desde SQL Editor o usando la `service_role key` en un script privado.

Ejemplo:

```sql
insert into public.profiles (id, display_name, username, role)
values
  ('UUID_DE_ADMIN', 'Admin', 'admin', 'owner'),
  ('UUID_DE_PERSONA_2', 'Persona 2', 'persona2', 'coordinator'),
  ('UUID_DE_PERSONA_3', 'Persona 3', 'persona3', 'coordinator')
on conflict (id) do update
set display_name = excluded.display_name,
    username = excluded.username,
    role = excluded.role;
```

## 4. Documentos privados

La migracion crea el bucket privado `ep-documents`.

Convencion de rutas:

```text
wedding_id/document_id/nombre-archivo.pdf
```

Asi Supabase puede comprobar que solo el equipo asignado a esa boda accede a sus archivos.

## 5. Portal novios

La tabla `portal_access` permite crear accesos por boda. La recomendacion para produccion es que el portal use un token seguro generado en servidor o Edge Function, no un PIN visible en el navegador.

Modulos previstos:

- Timeline.
- Invitados.
- Mesas.
- Musica.
- Transportes.
- Documentos visibles para novios.

## 6. Checklist antes de entregar

- Activar RLS en todas las tablas.
- Probar el acceso de cada usuario.
- Comprobar que un usuario solo ve bodas asignadas.
- Crear una boda desde cero.
- Subir, abrir y eliminar un documento.
- Probar enlaces a Google Maps.
- Probar mobile y tablet.
- Verificar que no aparece informacion tecnica en la UI final.
- Hacer backup inicial de la base.
