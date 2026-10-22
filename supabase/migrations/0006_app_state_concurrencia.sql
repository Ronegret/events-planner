-- ============================================================================
-- Guardado sin pisarse
-- ----------------------------------------------------------------------------
-- `app_state` es una sola fila con TODO el estado de la agencia, y hasta ahora
-- se escribía con un upsert a secas. Eso es «gana el último», en silencio:
--
--   10:00  Persona 1 abre la app y carga el estado.
--   10:05  Persona 2 abre la app y carga el mismo estado.
--   10:10  Persona 1 añade tres invitados → sube su copia.
--   10:12  Persona 2 marca un pago → sube LA SUYA, que es la de las 10:05.
--          Los tres invitados de Persona 1 desaparecen. Nadie se entera.
--
-- Con tres personas y guardado automático, esto pasa la primera semana. Y lo
-- peor de perder datos así no es perderlos: es no saber que los has perdido.
--
-- Se añade un número de versión que sube en cada escritura, y una función que
-- solo escribe si quien guarda venía de la versión actual. Si no, devuelve el
-- estado bueno y la aplicación avisa en vez de pisar.
--
-- ----------------------------------------------------------------------------
-- ESTE ARCHIVO ES IDEMPOTENTE: se puede volver a ejecutar entero sin romper
-- nada de lo que ya funciona. Está escrito así a propósito, porque la primera
-- aplicación se hizo a mano y con retoques sobre la marcha —el parámetro tuvo
-- que renombrarse a `p_version` para que coincidiera con lo que envía la app—
-- y el archivo del repositorio y la base acabaron diciendo cosas distintas.
-- Una migración que no se puede reaplicar deja de ser la verdad del esquema.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La columna de versión
-- ----------------------------------------------------------------------------
alter table public.app_state
  add column if not exists version bigint not null default 1;

-- ----------------------------------------------------------------------------
-- 2. Historial: las diez últimas versiones, por si hay que volver atrás.
--    No sustituye a las copias de Supabase; cubre el caso real de «he borrado
--    algo sin querer hace diez minutos».
-- ----------------------------------------------------------------------------
create table if not exists public.app_state_history (
  id bigserial primary key,
  data jsonb not null,
  version bigint not null,
  updated_by uuid references public.profiles(id),
  guardado_en timestamptz not null default now()
);

alter table public.app_state_history enable row level security;

drop policy if exists "el equipo puede leer el historial" on public.app_state_history;
create policy "el equipo puede leer el historial" on public.app_state_history
for select using (auth.role() = 'authenticated');

create or replace function public.archivar_app_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_state_history (data, version, updated_by)
  values (old.data, old.version, old.updated_by);

  delete from public.app_state_history
  where id not in (
    select id from public.app_state_history order by id desc limit 10
  );

  return new;
end;
$$;

drop trigger if exists app_state_archivar on public.app_state;
create trigger app_state_archivar
before update on public.app_state
for each row execute function public.archivar_app_state();

-- ----------------------------------------------------------------------------
-- 3. Guardado condicional
--
--    El parámetro se llama `p_version` porque es el nombre que envía la
--    aplicación (ver saveRemoteState en src/state.js). PostgREST resuelve las
--    funciones por nombre de parámetro, así que si no coinciden devuelve un
--    404 y la app cae al upsert directo — que funciona, pero sin control de
--    versión, que es justo lo que esto viene a arreglar.
--
--    Devuelve:
--      ok       → true si se guardó, false si alguien se adelantó
--      version  → la versión que hay ahora en el servidor
--      data     → el estado del servidor SOLO cuando hubo conflicto
-- ----------------------------------------------------------------------------
drop function if exists public.guardar_app_state(jsonb, bigint);
drop function if exists public.guardar_app_state(jsonb);

create function public.guardar_app_state(
  p_data jsonb,
  p_version bigint default null
)
returns table (ok boolean, version bigint, data jsonb)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actual bigint;
begin
  -- El bloqueo evita que dos guardados simultáneos lean la misma versión y
  -- ambos se crean ganadores.
  select a.version into v_actual
  from public.app_state a
  where a.id = 'main'
  for update;

  if v_actual is null then
    insert into public.app_state (id, data, updated_by, version)
    values ('main', p_data, auth.uid(), 1);
    return query select true, 1::bigint, null::jsonb;
    return;
  end if;

  -- NULL o 0 significan «no sé de qué versión vengo». Se aceptan para el
  -- primer guardado de un cliente que aún no ha leído nada, y para que una
  -- versión antigua de la app siga pudiendo guardar. No protege, pero no
  -- bloquea a nadie.
  if p_version is not null and p_version <> 0 and p_version <> v_actual then
    return query select false, v_actual, (select a.data from public.app_state a where a.id = 'main');
    return;
  end if;

  update public.app_state
  set data = p_data,
      updated_by = auth.uid(),
      version = v_actual + 1
  where id = 'main';

  return query select true, v_actual + 1, null::jsonb;
end;
$$;

comment on function public.guardar_app_state is
  'Guarda el estado compartido solo si quien escribe venía de la versión actual. Evita que dos personas se pisen sin enterarse.';

grant execute on function public.guardar_app_state(jsonb, bigint) to authenticated;

-- PostgREST cachea las funciones: sin esto, la app sigue viendo un 404 hasta
-- que el cache expire por su cuenta.
notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- 4. Comprobación
-- ----------------------------------------------------------------------------
--   select ok, version from public.guardar_app_state('{"x":1}'::jsonb, 0);
--     → ok = true
--   select ok, version from public.guardar_app_state('{"y":2}'::jsonb, 999999);
--     → ok = false   ← esto es lo que evita que os piséis
--   select version from public.app_state;
--   select count(*) from public.app_state_history;
