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
