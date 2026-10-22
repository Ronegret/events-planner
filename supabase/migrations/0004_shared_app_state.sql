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
