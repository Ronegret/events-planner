-- ============================================================================
-- Caché del buscador de proveedores
-- ----------------------------------------------------------------------------
-- Google cobra por búsqueda, y pedir la nota media y el número de reseñas sube
-- el precio de tramo. Sin esta tabla, tres personas del equipo buscando
-- «catering Barcelona» el mismo día son tres cobros por exactamente el mismo
-- resultado.
--
-- No es una base de datos de proveedores: es el recibo de lo que ya se preguntó.
-- Por eso caduca a los catorce días —un teléfono viejo es peor que no tenerlo—
-- y por eso nadie la lee desde la aplicación. Solo la escribe y la lee la
-- función `buscar-proveedores`, que va con la clave de servicio.
-- ============================================================================

create table if not exists public.busquedas_proveedores (
  clave       text primary key,
  consulta    text not null,
  resultados  jsonb not null,
  creado_at   timestamptz not null default now()
);

comment on table public.busquedas_proveedores is
  'Cache de las busquedas de proveedores en Google Places. Caduca a los 14 dias.';

create index if not exists busquedas_proveedores_creado_idx
  on public.busquedas_proveedores (creado_at desc);

-- RLS activado y SIN políticas a propósito: así ningún usuario autenticado
-- puede leer ni escribir aquí desde el cliente. La función de servidor usa la
-- clave de servicio, que salta RLS por diseño.
alter table public.busquedas_proveedores enable row level security;

revoke all on public.busquedas_proveedores from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Limpieza
-- ----------------------------------------------------------------------------
-- Una caché que solo crece deja de ser una caché y pasa a ser un vertedero.
-- Esto se puede llamar a mano o programar con pg_cron cuando interese.
create or replace function public.limpiar_busquedas_proveedores(dias int default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  borradas integer;
begin
  delete from public.busquedas_proveedores
   where creado_at < now() - make_interval(days => dias);
  get diagnostics borradas = row_count;
  return borradas;
end;
$$;

revoke all on function public.limpiar_busquedas_proveedores(int) from anon, authenticated;
