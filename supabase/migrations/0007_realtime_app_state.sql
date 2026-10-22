-- ============================================================================
-- Enterarse en el momento de lo que guardan las demas
-- ----------------------------------------------------------------------------
-- La proteccion de la 0006 impide que dos personas se pisen, pero solo actua
-- en el momento de guardar, y el precio lo paga la segunda: su cambio se
-- deshace y tiene que rehacerlo. Con tres personas sobre la misma boda el dia
-- del evento, eso pasa continuamente.
--
-- Medido en pruebas antes de esto:
--   Persona 1 marca una tarea   -> la sube.
--   Persona 2, con la app abierta  -> sigue viendo lo de antes.
--   Persona 2 marca otra tarea     -> choque, y su cambio se deshace.
--
-- Publicando `app_state` para tiempo real, la aplicacion se entera en cuanto
-- alguien guarda y trae el estado nuevo sola. Ademas de ver el trabajo de las
-- demas al momento, desaparece el choque: cuando la segunda guarda ya viene de
-- la version buena.
--
-- IDEMPOTENTE: se puede volver a ejecutar sin romper nada.
-- ============================================================================

-- La publicacion la crea Supabase por defecto, pero en este proyecto estaba
-- vacia. Se crea si faltara, para que el archivo valga en cualquier entorno.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end
$$;
