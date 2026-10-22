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
