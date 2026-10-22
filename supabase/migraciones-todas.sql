-- ============================================================================
-- Events Planner · todas las migraciones, en orden
-- ----------------------------------------------------------------------------
-- Pega este archivo entero en Supabase › SQL Editor y pulsa Run.
--
-- Va dentro de una transacción (BEGIN … COMMIT): o se aplica TODO o no se
-- aplica NADA. Si algo falla a mitad, la base de datos se queda exactamente
-- como estaba y el editor te dice qué línea ha fallado. No hay forma de
-- quedarse a medias.
--
-- Si al ejecutarlo dice que algo «already exists», significa que esa parte ya
-- estaba aplicada. Copia el mensaje y lo miramos: no hace falta que adivines.
--
-- Generado el 2026-09-05 desde 6 archivos.
-- ============================================================================

BEGIN;


-- ==========================================================================
-- 0001_initial_schema.sql
-- ==========================================================================

create extension if not exists pgcrypto;

create type app_role as enum ('owner', 'admin', 'coordinator', 'assistant');
create type wedding_status as enum ('lead', 'primera_reunion', 'contratada', 'en_preparacion', 'semana_boda', 'finalizada', 'archivada');
create type process_status as enum ('pendiente', 'en_tramitacion', 'listo', 'cancelado');
create type document_visibility as enum ('interno', 'novios', 'administracion');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique not null,
  role app_role not null default 'assistant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  couple_name text not null,
  wedding_date date,
  status wedding_status not null default 'en_preparacion',
  preparation_percent integer not null default 0 check (preparation_percent between 0 and 100),
  ceremony_name text,
  ceremony_address text,
  venue_name text,
  venue_address text,
  guests_estimate integer not null default 0,
  style_notes text,
  general_notes text,
  cover_image_url text,
  portal_enabled boolean not null default false,
  portal_pin_hash text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.wedding_team_members (
  wedding_id uuid references public.weddings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role_label text,
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references public.profiles(id),
  due_date date,
  status process_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.timeline_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  starts_at time not null,
  ends_at time,
  title text not null,
  category text,
  location text,
  provider_id uuid,
  owner_id uuid references public.profiles(id),
  notes text,
  status process_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  first_name text not null,
  last_name text,
  group_name text,
  phone text,
  email text,
  rsvp text not null default 'pendiente',
  menu text,
  allergies text,
  preferences text,
  notes text,
  source text not null default 'equipo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  name text not null,
  capacity integer not null default 10,
  owner_id uuid references public.profiles(id),
  status process_status not null default 'pendiente',
  locked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.table_assignments (
  table_id uuid references public.seating_tables(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (table_id, guest_id)
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  contact_name text,
  phone text,
  email text,
  instagram text,
  website text,
  zone text,
  notes text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wedding_providers (
  wedding_id uuid references public.weddings(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete cascade,
  status process_status not null default 'pendiente',
  notes text,
  primary key (wedding_id, provider_id)
);

create table public.music_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  moment text not null,
  title text not null,
  artist text,
  link_url text,
  status process_status not null default 'pendiente',
  notes text,
  created_at timestamptz not null default now()
);

create table public.transport_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  type text not null,
  starts_at time,
  pickup text,
  destination text,
  responsible_id uuid references public.profiles(id),
  provider_id uuid references public.providers(id),
  passengers text,
  status process_status not null default 'pendiente',
  notes text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  name text not null,
  document_type text,
  visibility document_visibility not null default 'interno',
  storage_path text,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  actor_type text not null default 'team',
  action text not null,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.timeline_items enable row level security;
alter table public.guests enable row level security;
alter table public.seating_tables enable row level security;
alter table public.table_assignments enable row level security;
alter table public.providers enable row level security;
alter table public.wedding_providers enable row level security;
alter table public.music_items enable row level security;
alter table public.transport_items enable row level security;
alter table public.documents enable row level security;
alter table public.activity_log enable row level security;

-- Policies are intentionally minimal placeholders. Production must tighten these
-- by role and wedding membership before using real data.
create policy "profiles can read self" on public.profiles for select using (auth.uid() = id);
create policy "owners can manage profiles" on public.profiles for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('owner','admin'))
);

-- ==========================================================================
-- 0002_security_policies.sql
-- ==========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger weddings_set_updated_at
before update on public.weddings
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger timeline_items_set_updated_at
before update on public.timeline_items
for each row execute function public.set_updated_at();

create trigger guests_set_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

create trigger seating_tables_set_updated_at
before update on public.seating_tables
for each row execute function public.set_updated_at();

create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

drop policy if exists "profiles can read self" on public.profiles;
drop policy if exists "owners can manage profiles" on public.profiles;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('owner', 'admin'), false)
$$;

create or replace function public.can_manage_weddings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() in ('owner', 'admin', 'coordinator'), false)
$$;

create or replace function public.is_wedding_member(target_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_team_members wtm
    where wtm.wedding_id = target_wedding_id
      and wtm.user_id = auth.uid()
  )
$$;

create or replace function public.can_access_wedding(target_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_admin() or public.is_wedding_member(target_wedding_id), false)
$$;

create policy "profiles can read team" on public.profiles
for select using (auth.role() = 'authenticated');

create policy "profiles can update self" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id and role = public.current_profile_role());

create policy "admins can insert profiles" on public.profiles
for insert with check (public.is_admin());

create policy "admins can delete profiles" on public.profiles
for delete using (public.is_admin());

create policy "admins can create weddings" on public.weddings
for insert with check (public.can_manage_weddings());

create policy "team can read weddings" on public.weddings
for select using (public.can_access_wedding(id));

create policy "team can update weddings" on public.weddings
for update using (public.can_access_wedding(id))
with check (public.can_access_wedding(id));

create policy "admins can delete weddings" on public.weddings
for delete using (public.is_admin());

create policy "team can read wedding members" on public.wedding_team_members
for select using (public.can_access_wedding(wedding_id));

create policy "admins can manage wedding members" on public.wedding_team_members
for all using (public.can_manage_weddings())
with check (public.can_manage_weddings());

create policy "team can read tasks" on public.tasks
for select using (public.can_access_wedding(wedding_id));

create policy "team can create tasks" on public.tasks
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can update tasks" on public.tasks
for update using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can delete tasks" on public.tasks
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read timeline" on public.timeline_items
for select using (public.can_access_wedding(wedding_id));

create policy "team can create timeline" on public.timeline_items
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can update timeline" on public.timeline_items
for update using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can delete timeline" on public.timeline_items
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read guests" on public.guests
for select using (public.can_access_wedding(wedding_id));

create policy "team can create guests" on public.guests
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can update guests" on public.guests
for update using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can delete guests" on public.guests
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read seating tables" on public.seating_tables
for select using (public.can_access_wedding(wedding_id));

create policy "team can create seating tables" on public.seating_tables
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can update seating tables" on public.seating_tables
for update using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can delete seating tables" on public.seating_tables
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read table assignments" on public.table_assignments
for select using (
  exists (
    select 1 from public.seating_tables st
    where st.id = table_id and public.can_access_wedding(st.wedding_id)
  )
);

create policy "team can manage table assignments" on public.table_assignments
for all using (
  exists (
    select 1 from public.seating_tables st
    where st.id = table_id and public.can_access_wedding(st.wedding_id)
  )
)
with check (
  exists (
    select 1 from public.seating_tables st
    where st.id = table_id and public.can_access_wedding(st.wedding_id)
  )
);

create policy "team can read providers" on public.providers
for select using (auth.role() = 'authenticated');

create policy "coordinators can manage providers" on public.providers
for all using (public.can_manage_weddings())
with check (public.can_manage_weddings());

create policy "team can read wedding providers" on public.wedding_providers
for select using (public.can_access_wedding(wedding_id));

create policy "team can manage wedding providers" on public.wedding_providers
for all using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can read music" on public.music_items
for select using (public.can_access_wedding(wedding_id));

create policy "team can manage music" on public.music_items
for all using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can read transports" on public.transport_items
for select using (public.can_access_wedding(wedding_id));

create policy "team can manage transports" on public.transport_items
for all using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can read documents" on public.documents
for select using (public.can_access_wedding(wedding_id));

create policy "team can create documents" on public.documents
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can update documents" on public.documents
for update using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can delete documents" on public.documents
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read activity" on public.activity_log
for select using (public.can_access_wedding(wedding_id));

create policy "team can create activity" on public.activity_log
for insert with check (public.can_access_wedding(wedding_id));

-- ==========================================================================
-- 0003_portal_documents_storage.sql
-- ==========================================================================

create table public.portal_access (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null default 'Portal novios',
  token_hash text not null,
  pin_hash text,
  enabled boolean not null default true,
  allowed_modules jsonb not null default '["timeline","guests","tables","music","transport","documents"]'::jsonb,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token_hash)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  body text,
  status public.process_status not null default 'pendiente',
  owner_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  body text not null,
  author_user_id uuid references public.profiles(id),
  author_type text not null default 'team',
  created_at timestamptz not null default now()
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

create table public.custom_sections (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  section_key text not null,
  fields jsonb not null default '[]'::jsonb,
  records jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, section_key)
);

alter table public.portal_access enable row level security;
alter table public.notes enable row level security;
alter table public.comments enable row level security;
alter table public.document_versions enable row level security;
alter table public.custom_sections enable row level security;

create trigger portal_access_set_updated_at
before update on public.portal_access
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create trigger custom_sections_set_updated_at
before update on public.custom_sections
for each row execute function public.set_updated_at();

create policy "team can read portal access" on public.portal_access
for select using (public.can_access_wedding(wedding_id));

create policy "admins can manage portal access" on public.portal_access
for all using (public.can_manage_weddings())
with check (public.can_manage_weddings());

create policy "team can read notes" on public.notes
for select using (public.can_access_wedding(wedding_id));

create policy "team can manage notes" on public.notes
for all using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

create policy "team can read comments" on public.comments
for select using (public.can_access_wedding(wedding_id));

create policy "team can create comments" on public.comments
for insert with check (public.can_access_wedding(wedding_id));

create policy "team can delete comments" on public.comments
for delete using (public.can_access_wedding(wedding_id));

create policy "team can read document versions" on public.document_versions
for select using (
  exists (
    select 1 from public.documents d
    where d.id = document_id and public.can_access_wedding(d.wedding_id)
  )
);

create policy "team can create document versions" on public.document_versions
for insert with check (
  exists (
    select 1 from public.documents d
    where d.id = document_id and public.can_access_wedding(d.wedding_id)
  )
);

create policy "team can delete document versions" on public.document_versions
for delete using (
  exists (
    select 1 from public.documents d
    where d.id = document_id and public.can_access_wedding(d.wedding_id)
  )
);

create policy "team can read custom sections" on public.custom_sections
for select using (public.can_access_wedding(wedding_id));

create policy "team can manage custom sections" on public.custom_sections
for all using (public.can_access_wedding(wedding_id))
with check (public.can_access_wedding(wedding_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ep-documents',
  'ep-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.uuid_from_storage_path(path text)
returns uuid
language plpgsql
immutable
as $$
begin
  return nullif(split_part(path, '/', 1), '')::uuid;
exception
  when others then
    return null;
end;
$$;

create policy "team can read storage documents" on storage.objects
for select using (
  bucket_id = 'ep-documents'
  and public.can_access_wedding(public.uuid_from_storage_path(name))
);

create policy "team can upload storage documents" on storage.objects
for insert with check (
  bucket_id = 'ep-documents'
  and public.can_access_wedding(public.uuid_from_storage_path(name))
);

create policy "team can update storage documents" on storage.objects
for update using (
  bucket_id = 'ep-documents'
  and public.can_access_wedding(public.uuid_from_storage_path(name))
)
with check (
  bucket_id = 'ep-documents'
  and public.can_access_wedding(public.uuid_from_storage_path(name))
);

create policy "team can delete storage documents" on storage.objects
for delete using (
  bucket_id = 'ep-documents'
  and public.can_access_wedding(public.uuid_from_storage_path(name))
);

-- ==========================================================================
-- 0004_shared_app_state.sql
-- ==========================================================================

create table public.app_state (
  id text primary key default 'main',
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint app_state_singleton check (id = 'main')
);

alter table public.app_state enable row level security;

create trigger app_state_set_updated_at
before update on public.app_state
for each row execute function public.set_updated_at();

create policy "authenticated users can read app state" on public.app_state
for select using (auth.role() = 'authenticated');

create policy "authenticated users can create app state" on public.app_state
for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can update app state" on public.app_state
for update using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into public.app_state (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- ==========================================================================
-- 0005_core_relational_bridge.sql
-- ==========================================================================

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

-- ==========================================================================
-- 0006_app_state_concurrencia.sql
-- ==========================================================================

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

COMMIT;
