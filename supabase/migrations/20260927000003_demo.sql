-- =============================================================================
-- App Taller · Datos demo
--
-- Los datos de ejemplo se generan en TypeScript (src/lib/mock/seed.ts, la
-- misma fuente que la demo sin servidor) y se cargan con reset_demo(payload).
-- Todo lo demo queda marcado (is_demo) y se borra con purge_demo():
--
--   npm run db:demo -- purge      (o en el SQL editor: select public.purge_demo();)
--
-- Mientras app_settings.demo_mode = 'true', cualquiera puede reiniciar la demo
-- desde la app (botón «Reiniciar»). En producción demo_mode = 'false'.
-- =============================================================================

-- Los registros hechos mientras la instalación está en modo demo se marcan
-- como demo, para borrarlos junto al resto.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, is_demo)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    coalesce((select value = 'true' from public.app_settings where key = 'demo_mode'), false)
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public._demo_mode() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value = 'true' from public.app_settings where key = 'demo_mode'), false)
$$;

-- Borra todo lo marcado como demo (usuarios demo y sus datos, taller demo).
create or replace function public._purge_demo_data() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id in (select id from public.profiles where is_demo);
  delete from public.workshops where is_demo;
end $$;

create or replace function public.reset_demo(p_seed jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  u jsonb;
  db jsonb := p_seed -> 'db';
  bad int;
begin
  if not public._demo_mode() and coalesce(auth.role(), '') <> 'service_role' then
    perform public._fail('La demo no está activada en esta instalación.');
  end if;

  perform public._purge_demo_data();

  -- Usuarios demo (solo ids y emails de la demo)
  for u in select value from jsonb_array_elements(p_seed -> 'auth_users') loop
    if (u ->> 'id') !~ '^00000000-0000-4000-8' or (u ->> 'email') !~* '@(demo\.es|tallerdemo\.es)$' then
      perform public._fail('Datos demo no válidos.');
    end if;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', (u ->> 'id')::uuid, 'authenticated', 'authenticated',
      lower(u ->> 'email'), extensions.crypt(u ->> 'password', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      u ->> 'id', (u ->> 'id')::uuid,
      jsonb_build_object('sub', u ->> 'id', 'email', lower(u ->> 'email'), 'email_verified', true),
      'email', now(), now(), now()
    );
  end loop;

  insert into public.workshops (id, name, slug, phone, email, address, review_url, timezone, is_demo, created_at)
  select id, name, slug, phone, email, address, review_url, coalesce(timezone, 'Europe/Madrid'), true, created_at
  from jsonb_populate_recordset(null::public.workshops, db -> 'workshops');

  -- El trigger ya creó los perfiles (como clientes); se completan con los datos demo
  update public.profiles p set
    email = s.email, full_name = s.full_name, phone = s.phone, role = s.role,
    workshop_id = s.workshop_id, is_demo = true, created_at = s.created_at
  from jsonb_populate_recordset(null::public.profiles, db -> 'profiles') s
  where p.id = s.id;

  insert into public.vehicles (id, customer_id, workshop_id, license_plate, plate_format, make, model, year, vin, created_at)
  select id, customer_id, workshop_id, license_plate, coalesce(plate_format, 'es'), make, model, year, vin, created_at
  from jsonb_populate_recordset(null::public.vehicles, db -> 'vehicles');

  insert into public.appointments
  select * from jsonb_populate_recordset(null::public.appointments, db -> 'appointments');
  insert into public.appointment_media
  select * from jsonb_populate_recordset(null::public.appointment_media, db -> 'appointment_media');
  insert into public.repair_orders
  select * from jsonb_populate_recordset(null::public.repair_orders, db -> 'repair_orders');
  insert into public.repair_status_history
  select * from jsonb_populate_recordset(null::public.repair_status_history, db -> 'repair_status_history');
  insert into public.estimates
  select * from jsonb_populate_recordset(null::public.estimates, db -> 'estimates');
  insert into public.estimate_items
  select * from jsonb_populate_recordset(null::public.estimate_items, db -> 'estimate_items');
  insert into public.messages
  select * from jsonb_populate_recordset(null::public.messages, db -> 'messages');
  insert into public.notifications
  select * from jsonb_populate_recordset(null::public.notifications, db -> 'notifications');
  insert into public.workshop_availability
  select * from jsonb_populate_recordset(null::public.workshop_availability, db -> 'workshop_availability');
  insert into public.workshop_closures
  select * from jsonb_populate_recordset(null::public.workshop_closures, db -> 'workshop_closures');

  -- Los datos demo solo pueden tocar el taller demo y usuarios demo
  select count(*) into bad from (
    select workshop_id from public.appointments union all
    select workshop_id from public.repair_orders union all
    select workshop_id from public.messages union all
    select workshop_id from public.workshop_availability
  ) x join public.workshops w on w.id = x.workshop_id
  where not w.is_demo and x.workshop_id in (
    select (value ->> 'id')::uuid from jsonb_array_elements(db -> 'workshops')
  );
  if bad > 0 or exists (
    select 1 from jsonb_populate_recordset(null::public.notifications, db -> 'notifications') n
    left join public.profiles p on p.id = n.user_id where not coalesce(p.is_demo, false)
  ) then
    perform public._fail('Datos demo no válidos.');
  end if;
end $$;

-- Borrado definitivo de la demo (solo con la clave de servicio o desde el SQL editor)
create or replace function public.purge_demo()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._purge_demo_data();
  insert into public.app_settings (key, value) values ('demo_mode', 'false')
  on conflict (key) do update set value = 'false';
end $$;

revoke execute on function public._demo_mode() from public, anon, authenticated;
revoke execute on function public._purge_demo_data() from public, anon, authenticated;
revoke execute on function public.purge_demo() from public, anon, authenticated;
grant execute on function public.reset_demo(jsonb) to anon, authenticated;
