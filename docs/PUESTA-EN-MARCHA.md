# Puesta en marcha de Events Planner

Hasta que se completen estos pasos, **todo vive en el navegador de quien la usa**. Si alguien del equipo limpia el navegador o cambia de portátil, se pierde el trabajo. Son unos 30 minutos, una sola vez.

---

## 1. Aplicar las migraciones

En [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor**.

Ejecutar, **en este orden**, el contenido de:

1. `supabase/migrations/0001_initial_schema.sql` — las 20 tablas
2. `supabase/migrations/0002_security_policies.sql` — quién puede ver qué
3. `supabase/migrations/0003_portal_documents_storage.sql` — documentos del portal
4. `supabase/migrations/0004_shared_app_state.sql` — estado compartido del equipo

Copiar el archivo entero, pegar, **Run**. Si alguno da error, no seguir con el siguiente: parar y mirar el mensaje.

Para comprobar que fue bien, en **Table Editor** deben aparecer las tablas (`weddings`, `guests`, `budget`, `contracts`…).

---

## 2. Crear los usuarios del equipo

**Authentication → Users → Add user → Create new user.** Marcar **Auto Confirm User** para que no haya que verificar el correo.

| Usuario en la app | Email a introducir | Rol |
|---|---|---|
| admin | `admin@example.com` | Administración |
| persona2 | `persona2@example.com` | Coordinación |
| persona3 | `persona3@example.com` | Coordinación |

El dominio `@example.com` es solo un ejemplo: pon el tuyo, y no tiene que ser un correo real: la app lo construye sola a partir del nombre de usuario (`authEmailDomain` en `app-config.js`). Cada persona entra escribiendo su usuario (`admin`), no el correo completo.

La contraseña la pone cada una en este paso. **Que no sea la misma que tenía la demo.**

---

## 3. Enlazar los usuarios con sus perfiles

De cada usuario recién creado, copiar su **UUID** (la columna `UID` en la lista). Después, en **SQL Editor**, ejecutar esto sustituyendo los tres UUID:

```sql
insert into public.profiles (id, display_name, username, role)
values
  ('PEGA_AQUI_EL_UUID_DE_ADMIN',     'Admin',     'admin',    'owner'),
  ('PEGA_AQUI_EL_UUID_DE_PERSONA_2', 'Persona 2', 'persona2', 'coordinator'),
  ('PEGA_AQUI_EL_UUID_DE_PERSONA_3', 'Persona 3', 'persona3', 'coordinator')
on conflict (id) do update
set display_name = excluded.display_name,
    username     = excluded.username,
    role         = excluded.role;
```

Sin este paso el acceso funciona pero la app no sabe quién es quién ni qué permisos tiene.

---

## 4. Comprobar que sincroniza

1. Abrir la app y entrar como `admin`.
2. Cambiar cualquier cosa — por ejemplo, el nombre de una mesa.
3. En Supabase, **Table Editor → `app_state`**: debe haber una fila `main` con la fecha de hace unos segundos.
4. Abrir la app en otro navegador (o en el móvil) y entrar: debe verse el mismo cambio.

Si el paso 3 no ocurre, mirar la consola del navegador (F12): el error de Supabase sale ahí.

---

## 5. Vaciar los datos de demostración

Las tres bodas, los proveedores y las partidas de presupuesto que trae la app son **de ejemplo**. Sirven para aprender a usarla, pero no son reales.

Cuando ya no hagan falta: **Ajustes → Restablecer datos de demostración**, o directamente crear las bodas de verdad y borrar las de ejemplo una a una (ahora hay botón de Deshacer, así que no es peligroso).

Para empezar una boda nueva rápido, usar **⧉ Duplicar** en la tarjeta de una boda parecida: copia timeline, tareas y servicios en estado pendiente, y no copia nada de la otra pareja.

---

## Después: copias de seguridad

Supabase hace copias automáticas, pero conviene tener una propia fuera de ahí:

- **Ajustes → Descargar copia de seguridad** guarda un JSON con todo.
- Hacerlo una vez al mes, y siempre la semana antes de una boda grande.

---

## Si algo va mal

**No entra ningún usuario.** Revisar que el usuario existe en Authentication y que está confirmado. Si Supabase falla, la app cae a las contraseñas locales — así que se puede seguir trabajando mientras se arregla.

**Entra pero no ve nada.** Falta el paso 3: el usuario existe pero no tiene perfil.

**Dice "sin conexión" con internet funcionando.** Es que no llega a Supabase. La app sigue guardando en el dispositivo y sube todo cuando vuelve; en la barra de arriba se ve cuántos cambios quedan pendientes.

**El día de la boda no hay cobertura.** No pasa nada: la app abre igual y guarda en el móvil. Cuando haya red, sincroniza sola. Lo importante es haberla abierto **al menos una vez con internet en ese dispositivo** antes de ir a la finca.
