-- Primera fase de la migracion desde app_state: bodas y tareas pasan a tener
-- una copia relacional validada, auditable y protegida por las RLS existentes.

alter table public.weddings
  add column if not exists legacy_id text,
  add column if not exists lead_name text,
  add column if not exists palette_primary text,
  add column if not exists palette_secondary text,
  add column if not exists palette_accent text,
  add column if not exists palette_notes text,
  add column if not exists budget_target numeric(12, 2),
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists synced_at timestamptz;

create unique index if not exists weddings_legacy_id_key
  on public.weddings (legacy_id)
  where legacy_id is not null;

alter table public.weddings
  drop constraint if exists weddings_palette_primary_format,
  add constraint weddings_palette_primary_format
    check (palette_primary is null or palette_primary ~ '^#[0-9A-Fa-f]{6}$') not valid,
  drop constraint if exists weddings_palette_secondary_format,
  add constraint weddings_palette_secondary_format
    check (palette_secondary is null or palette_secondary ~ '^#[0-9A-Fa-f]{6}$') not valid,
  drop constraint if exists weddings_palette_accent_format,
  add constraint weddings_palette_accent_format
    check (palette_accent is null or palette_accent ~ '^#[0-9A-Fa-f]{6}$') not valid;

alter table public.tasks
  add column if not exists legacy_id text,
  add column if not exists owner_name text,
  add column if not exists completed_by_name text,
  add column if not exists completed_at timestamptz,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists synced_at timestamptz,
  add column if not exists archived_at timestamptz;

create unique index if not exists tasks_legacy_id_key
  on public.tasks (legacy_id)
  where legacy_id is not null;

create or replace function public._ep_try_date(value text)
returns date
language plpgsql
stable
as $$
begin
  if nullif(btrim(value), '') is null then return null; end if;
  return value::date;
exception when others then
  return null;
end;
$$;

create or replace function public._ep_try_timestamptz(value text)
returns timestamptz
language plpgsql
stable
as $$
begin
  if nullif(btrim(value), '') is null then return null; end if;
  return value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public._ep_wedding_status(value text)
returns public.wedding_status
language sql
immutable
as $$
  select case
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%archiv%' then 'archivada'::public.wedding_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%final%'
      or translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%celebr%' then 'finalizada'::public.wedding_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%semana%' then 'semana_boda'::public.wedding_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%contrat%' then 'contratada'::public.wedding_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%primera%' then 'primera_reunion'::public.wedding_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%lead%' then 'lead'::public.wedding_status
    else 'en_preparacion'::public.wedding_status
  end
$$;

create or replace function public._ep_process_status(value text)
returns public.process_status
language sql
immutable
as $$
  select case
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') ~ '(listo|hecho|complet|confirm)' then 'listo'::public.process_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') like '%cancel%' then 'cancelado'::public.process_status
    when translate(lower(coalesce(value, '')), 'áéíóúüñ', 'aeiouun') ~ '(tramit|curso|progreso)' then 'en_tramitacion'::public.process_status
    else 'pendiente'::public.process_status
  end
$$;

create or replace function public._ep_validate_core_snapshot(snapshot jsonb)
returns void
language plpgsql
immutable
as $$
declare
  item jsonb;
begin
  if snapshot is null or jsonb_typeof(snapshot) <> 'object' then
    raise exception 'El estado compartido debe ser un objeto JSON';
  end if;

  if snapshot ? 'weddings' then
    if jsonb_typeof(snapshot->'weddings') <> 'array' then
      raise exception 'weddings debe ser una lista';
    end if;
    if jsonb_array_length(snapshot->'weddings') > 500 then
      raise exception 'El estado supera el limite de 500 bodas';
    end if;
    for item in select value from jsonb_array_elements(snapshot->'weddings') loop
      if nullif(btrim(item->>'id'), '') is null
        or length(item->>'id') > 120
        or nullif(btrim(item->>'couple'), '') is null
        or length(item->>'couple') > 240 then
        raise exception 'Cada boda necesita id y nombre de pareja validos';
      end if;
    end loop;
  end if;

  if snapshot ? 'tasks' then
    if jsonb_typeof(snapshot->'tasks') <> 'array' then
      raise exception 'tasks debe ser una lista';
    end if;
    if jsonb_array_length(snapshot->'tasks') > 100000 then
      raise exception 'El estado supera el limite de 100000 tareas';
    end if;
    for item in select value from jsonb_array_elements(snapshot->'tasks') loop
      if nullif(btrim(item->>'id'), '') is null
        or length(item->>'id') > 120
        or nullif(btrim(item->>'weddingId'), '') is null
        or length(item->>'weddingId') > 120
        or nullif(btrim(item->>'title'), '') is null
        or length(item->>'title') > 500 then
        raise exception 'Cada tarea necesita id, boda y titulo validos';
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public._ep_sync_core_snapshot(snapshot jsonb, actor uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wedding jsonb;
  task jsonb;
  target_wedding_id uuid;
  actor_profile_id uuid;
begin
  perform public._ep_validate_core_snapshot(snapshot);
  select id into actor_profile_id from public.profiles where id = actor;
  perform set_config('ep.actor_id', coalesce(actor_profile_id::text, ''), true);

  if snapshot ? 'weddings' then
    for wedding in select value from jsonb_array_elements(snapshot->'weddings') loop
      insert into public.weddings (
        legacy_id, couple_name, wedding_date, status, preparation_percent,
        ceremony_name, ceremony_address, venue_name, venue_address,
        guests_estimate, style_notes, general_notes, cover_image_url,
        portal_enabled, created_by, lead_name, palette_primary,
        palette_secondary, palette_accent, palette_notes, budget_target,
        source_payload, synced_at, archived_at
      ) values (
        wedding->>'id', btrim(wedding->>'couple'), public._ep_try_date(wedding->>'date'),
        public._ep_wedding_status(wedding->>'status'),
        least(100, greatest(0, case when coalesce(wedding->>'progress', '') ~ '^\d+$' then (wedding->>'progress')::integer else 0 end)),
        nullif(btrim(wedding->>'ceremony'), ''), nullif(btrim(wedding->>'ceremonyAddress'), ''),
        nullif(btrim(wedding->>'venue'), ''), nullif(btrim(wedding->>'venueAddress'), ''),
        greatest(0, case when coalesce(wedding->>'guestsEstimate', '') ~ '^\d+$' then (wedding->>'guestsEstimate')::integer else 0 end),
        nullif(btrim(wedding->>'style'), ''), nullif(btrim(wedding->>'notes'), ''),
        nullif(btrim(wedding->>'cover'), ''), coalesce((wedding->>'portalActive')::boolean, false),
        actor_profile_id, nullif(btrim(wedding->>'lead'), ''),
        case when coalesce(wedding->>'palettePrimary', '') ~ '^#[0-9A-Fa-f]{6}$' then wedding->>'palettePrimary' end,
        case when coalesce(wedding->>'paletteSecondary', '') ~ '^#[0-9A-Fa-f]{6}$' then wedding->>'paletteSecondary' end,
        case when coalesce(wedding->>'paletteAccent', '') ~ '^#[0-9A-Fa-f]{6}$' then wedding->>'paletteAccent' end,
        nullif(btrim(wedding->>'paletteNotes'), ''),
        case when coalesce(wedding->>'presupuestoObjetivo', '') ~ '^\d+(\.\d{1,2})?$' then (wedding->>'presupuestoObjetivo')::numeric end,
        wedding, now(), null
      )
      on conflict (legacy_id) where legacy_id is not null do update set
        couple_name = excluded.couple_name,
        wedding_date = excluded.wedding_date,
        status = excluded.status,
        preparation_percent = excluded.preparation_percent,
        ceremony_name = excluded.ceremony_name,
        ceremony_address = excluded.ceremony_address,
        venue_name = excluded.venue_name,
        venue_address = excluded.venue_address,
        guests_estimate = excluded.guests_estimate,
        style_notes = excluded.style_notes,
        general_notes = excluded.general_notes,
        cover_image_url = excluded.cover_image_url,
        portal_enabled = excluded.portal_enabled,
        lead_name = excluded.lead_name,
        palette_primary = excluded.palette_primary,
        palette_secondary = excluded.palette_secondary,
        palette_accent = excluded.palette_accent,
        palette_notes = excluded.palette_notes,
        budget_target = excluded.budget_target,
        source_payload = excluded.source_payload,
        synced_at = excluded.synced_at,
        archived_at = null
      where (weddings.couple_name, weddings.wedding_date, weddings.status,
        weddings.preparation_percent, weddings.ceremony_name, weddings.ceremony_address,
        weddings.venue_name, weddings.venue_address, weddings.guests_estimate,
        weddings.style_notes, weddings.general_notes, weddings.cover_image_url,
        weddings.portal_enabled, weddings.lead_name, weddings.palette_primary,
        weddings.palette_secondary, weddings.palette_accent, weddings.palette_notes,
        weddings.budget_target, weddings.source_payload, weddings.archived_at)
        is distinct from
        (excluded.couple_name, excluded.wedding_date, excluded.status,
        excluded.preparation_percent, excluded.ceremony_name, excluded.ceremony_address,
        excluded.venue_name, excluded.venue_address, excluded.guests_estimate,
        excluded.style_notes, excluded.general_notes, excluded.cover_image_url,
        excluded.portal_enabled, excluded.lead_name, excluded.palette_primary,
        excluded.palette_secondary, excluded.palette_accent, excluded.palette_notes,
        excluded.budget_target, excluded.source_payload, null);

      select id into target_wedding_id
      from public.weddings where legacy_id = wedding->>'id';

      insert into public.wedding_team_members (wedding_id, user_id, role_label)
      select target_wedding_id, p.id,
        case p.role
          when 'owner' then 'Administracion'
          when 'admin' then 'Administracion'
          when 'coordinator' then 'Coordinacion'
          else 'Equipo'
        end
      from public.profiles p
      on conflict (wedding_id, user_id) do nothing;
    end loop;

    update public.weddings w
    set archived_at = now(), synced_at = now()
    where w.legacy_id is not null
      and w.archived_at is null
      and not exists (
        select 1 from jsonb_array_elements(snapshot->'weddings') item
        where item->>'id' = w.legacy_id
      );
  end if;

  if snapshot ? 'tasks' then
    for task in select value from jsonb_array_elements(snapshot->'tasks') loop
      select id into target_wedding_id
      from public.weddings
      where legacy_id = task->>'weddingId' and archived_at is null;

      if target_wedding_id is null then
        raise exception 'La tarea % referencia una boda inexistente', task->>'id';
      end if;

      insert into public.tasks (
        legacy_id, wedding_id, title, description, owner_id, owner_name,
        due_date, status, completed_by_name, completed_at, source_payload,
        synced_at, archived_at
      ) values (
        task->>'id', target_wedding_id, btrim(task->>'title'),
        nullif(btrim(task->>'description'), ''),
        (select p.id from public.profiles p where lower(p.display_name) = lower(task->>'owner') limit 1),
        nullif(btrim(task->>'owner'), ''), public._ep_try_date(task->>'due'),
        public._ep_process_status(task->>'status'), nullif(btrim(task->>'completedBy'), ''),
        public._ep_try_timestamptz(coalesce(task->>'completedAt', task->>'confirmedAt')),
        task, now(), null
      )
      on conflict (legacy_id) where legacy_id is not null do update set
        wedding_id = excluded.wedding_id,
        title = excluded.title,
        description = excluded.description,
        owner_id = excluded.owner_id,
        owner_name = excluded.owner_name,
        due_date = excluded.due_date,
        status = excluded.status,
        completed_by_name = excluded.completed_by_name,
        completed_at = excluded.completed_at,
        source_payload = excluded.source_payload,
        synced_at = excluded.synced_at,
        archived_at = null
      where (tasks.wedding_id, tasks.title, tasks.description, tasks.owner_id,
        tasks.owner_name, tasks.due_date, tasks.status, tasks.completed_by_name,
        tasks.completed_at, tasks.source_payload, tasks.archived_at)
        is distinct from
        (excluded.wedding_id, excluded.title, excluded.description, excluded.owner_id,
        excluded.owner_name, excluded.due_date, excluded.status, excluded.completed_by_name,
        excluded.completed_at, excluded.source_payload, null);
    end loop;

    update public.tasks t
    set archived_at = now(), synced_at = now()
    where t.legacy_id is not null
      and t.archived_at is null
      and not exists (
        select 1 from jsonb_array_elements(snapshot->'tasks') item
        where item->>'id' = t.legacy_id
      );
  end if;
end;
$$;

create or replace function public._ep_sync_core_app_state_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._ep_sync_core_snapshot(new.data, coalesce(new.updated_by, auth.uid()));
  return new;
end;
$$;

drop trigger if exists app_state_sync_core on public.app_state;
create trigger app_state_sync_core
after insert or update of data on public.app_state
for each row execute function public._ep_sync_core_app_state_trigger();

create or replace function public._ep_assign_profile_weddings_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.wedding_team_members (wedding_id, user_id, role_label)
  select w.id, new.id,
    case new.role
      when 'owner' then 'Administracion'
      when 'admin' then 'Administracion'
      when 'coordinator' then 'Coordinacion'
      else 'Equipo'
    end
  from public.weddings w
  where w.archived_at is null
  on conflict (wedding_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists profiles_assign_existing_weddings on public.profiles;
create trigger profiles_assign_existing_weddings
after insert on public.profiles
for each row execute function public._ep_assign_profile_weddings_trigger();

create or replace function public._ep_audit_core_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  target_wedding_id uuid;
  target_entity_id uuid;
  action_name text;
begin
  actor := nullif(current_setting('ep.actor_id', true), '')::uuid;
  if actor is null then actor := auth.uid(); end if;
  if not exists (select 1 from public.profiles where id = actor) then actor := null; end if;

  if tg_table_name = 'weddings' then
    target_wedding_id := coalesce(new.id, old.id);
    target_entity_id := target_wedding_id;
  else
    target_wedding_id := coalesce(new.wedding_id, old.wedding_id);
    target_entity_id := coalesce(new.id, old.id);
  end if;

  action_name := case
    when tg_op = 'INSERT' then 'core_created'
    when tg_op = 'DELETE' then 'core_deleted'
    when old.archived_at is null and new.archived_at is not null then 'core_archived'
    when old.archived_at is not null and new.archived_at is null then 'core_restored'
    else 'core_updated'
  end;

  insert into public.activity_log (
    wedding_id, actor_user_id, actor_type, action, entity_type,
    entity_id, before_data, after_data
  ) values (
    target_wedding_id, actor, 'team', action_name, tg_table_name,
    target_entity_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists weddings_audit_core on public.weddings;
create trigger weddings_audit_core
after insert or update or delete on public.weddings
for each row execute function public._ep_audit_core_change();

drop trigger if exists tasks_audit_core on public.tasks;
create trigger tasks_audit_core
after insert or update or delete on public.tasks
for each row execute function public._ep_audit_core_change();

revoke all on function public._ep_try_date(text) from public, anon, authenticated;
revoke all on function public._ep_try_timestamptz(text) from public, anon, authenticated;
revoke all on function public._ep_wedding_status(text) from public, anon, authenticated;
revoke all on function public._ep_process_status(text) from public, anon, authenticated;
revoke all on function public._ep_validate_core_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public._ep_sync_core_snapshot(jsonb, uuid) from public, anon, authenticated;
revoke all on function public._ep_sync_core_app_state_trigger() from public, anon, authenticated;
revoke all on function public._ep_assign_profile_weddings_trigger() from public, anon, authenticated;
revoke all on function public._ep_audit_core_change() from public, anon, authenticated;

-- PostgreSQL exige privilegio de tabla y politica RLS. Se conceden solo las
-- operaciones que las politicas de 0002 ya filtran por rol y membresia.
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.weddings to authenticated;
grant select, insert, update, delete on public.wedding_team_members to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.activity_log to authenticated;

-- Normaliza el estado que ya exista cuando se aplica la migracion.
select public._ep_sync_core_snapshot(data, updated_by)
from public.app_state
where id = 'main' and data <> '{}'::jsonb;
