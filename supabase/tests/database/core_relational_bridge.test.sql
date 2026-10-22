begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(15);

select has_column('public', 'weddings', 'legacy_id', 'Bodas conserva el identificador del frontend');
select has_column('public', 'tasks', 'legacy_id', 'Tareas conserva el identificador del frontend');
select has_column('public', 'tasks', 'archived_at', 'Tareas admite borrado logico');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona1@test.local', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'persona2@test.local', '', now(), now(), now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'externa@test.local', '', now(), now(), now());

insert into public.profiles (id, display_name, username, role) values
  ('10000000-0000-0000-0000-000000000001', 'Persona 1', 'persona1-test', 'owner'),
  ('10000000-0000-0000-0000-000000000002', 'Persona 2', 'persona2-test', 'coordinator');

select lives_ok(
  $$
    update public.app_state
    set updated_by = '10000000-0000-0000-0000-000000000001',
        data = '{
          "weddings": [{
            "id": "w-prueba", "couple": "Ana & Marc", "date": "2027-05-22",
            "status": "En preparacion", "progress": 35, "guestsEstimate": 90,
            "lead": "Persona 1", "palettePrimary": "#526b60",
            "paletteSecondary": "#c8aaa2", "paletteAccent": "#e8e0cf",
            "portalActive": true
          }],
          "tasks": [{
            "id": "task-prueba", "weddingId": "w-prueba",
            "title": "Confirmar ceremonia", "owner": "Persona 2",
            "due": "2027-04-01", "status": "En tramitacion"
          }]
        }'::jsonb
    where id = 'main'
  $$,
  'El estado compartido sincroniza bodas y tareas'
);

select is((select count(*)::integer from public.weddings where legacy_id = 'w-prueba'), 1, 'Crea una sola boda relacional');
select is((select count(*)::integer from public.tasks where legacy_id = 'task-prueba'), 1, 'Crea una sola tarea relacional');
select is((select status::text from public.tasks where legacy_id = 'task-prueba'), 'en_tramitacion', 'Traduce el estado de tarea al enum');
select is((select owner_id from public.tasks where legacy_id = 'task-prueba'), '10000000-0000-0000-0000-000000000002'::uuid, 'Relaciona responsable por nombre');
select is((select count(*)::integer from public.wedding_team_members), 2, 'Asigna la boda a todo el equipo existente');
select ok((select count(*) >= 2 from public.activity_log), 'Registra la creacion de boda y tarea en auditoria');

insert into public.profiles (id, display_name, username, role)
values ('10000000-0000-0000-0000-000000000003', 'Externa', 'externa-test', 'assistant');

delete from public.wedding_team_members
where user_id = '10000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.weddings where legacy_id = 'w-prueba'), 1, 'Un miembro puede leer su boda');

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::integer from public.weddings where legacy_id = 'w-prueba'), 0, 'Un usuario sin membresia no puede leer la boda');
select is((select count(*)::integer from public.tasks where legacy_id = 'task-prueba'), 0, 'Un usuario sin membresia no puede leer sus tareas');
reset role;

update public.app_state
set updated_by = '10000000-0000-0000-0000-000000000001',
    data = jsonb_set(data, '{tasks}', '[]'::jsonb)
where id = 'main';

select ok((select archived_at is not null from public.tasks where legacy_id = 'task-prueba'), 'Eliminar en la app archiva la tarea sin destruirla');

select throws_ok(
  $$
    update public.app_state
    set data = '{"weddings":[{"id":"sin-nombre"}],"tasks":[]}'::jsonb
    where id = 'main'
  $$,
  'P0001',
  'Cada boda necesita id y nombre de pareja validos',
  'Rechaza una boda incompleta en el servidor'
);

select * from finish();
rollback;
