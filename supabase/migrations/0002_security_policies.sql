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
