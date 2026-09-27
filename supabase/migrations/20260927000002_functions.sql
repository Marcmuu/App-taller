-- =============================================================================
-- App Taller · Funciones (RPC)
-- Todas las escrituras pasan por aquí. Son SECURITY DEFINER: comprueban
-- quién llama (auth.uid()) y sus permisos antes de tocar nada, y hacen cada
-- operación en una sola transacción (estado + historial + avisos).
-- Errores: SQLSTATE P0001 = mensaje para el usuario; TA001 = hora no disponible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ayudas internas (no ejecutables desde la API)
-- -----------------------------------------------------------------------------
create or replace function public._fail(msg text) returns void language plpgsql as $$
begin
  raise exception using message = msg, errcode = 'P0001';
end $$;

create or replace function public._me() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then perform public._fail('Tu sesión ha caducado. Vuelve a entrar.'); end if;
  return p;
end $$;

create or replace function public._require_staff(ws uuid) returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := public._me();
  if p.role = 'customer' or p.workshop_id is distinct from ws then
    perform public._fail('No tienes permiso para hacer esto.');
  end if;
  return p;
end $$;

create or replace function public._require_customer(customer uuid) returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  p := public._me();
  if p.id <> customer then perform public._fail('No tienes permiso para hacer esto.'); end if;
  return p;
end $$;

-- Taller por defecto de un cliente (instalación de un solo taller; los datos
-- demo usan el taller demo y los reales el taller real).
create or replace function public._default_workshop(p public.profiles) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.workshops order by (is_demo = p.is_demo) desc, created_at limit 1
$$;

create or replace function public._fmt(ts timestamptz, tz text) returns text
language sql stable as $$
  select (array['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow from ts at time zone tz)::int + 1]
    || ' ' || extract(day from ts at time zone tz)::int
    || ' ' || (array['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'])[extract(month from ts at time zone tz)::int]
    || ', ' || to_char(ts at time zone tz, 'HH24:MI')
$$;

create or replace function public._ws_tz(ws uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select timezone from public.workshops where id = ws), 'Europe/Madrid')
$$;

create or replace function public._vehicle_label(vehicle uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select make || ' ' || model from public.vehicles where id = vehicle), 'vehículo')
$$;

create or replace function public._category_label(cat text) returns text language sql immutable as $$
  select case cat
    when 'averia' then 'Avería' when 'mantenimiento' then 'Mantenimiento'
    when 'testigo' then 'Testigo encendido' when 'ruido' then 'Ruido extraño'
    when 'otro' then 'Otro' else 'Sin motivo' end
$$;

create or replace function public._notify(target uuid, repair uuid, kind text, title text, body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, repair_order_id, type, title, body) values (target, repair, kind, title, body)
$$;

create or replace function public._notify_staff(ws uuid, repair uuid, kind text, title text, body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, repair_order_id, type, title, body)
  select id, repair, kind, title, body from public.profiles where workshop_id = ws and role <> 'customer'
$$;

-- Serializa las reservas de un taller (evita que dos personas cojan la última plaza).
create or replace function public._lock_workshop(ws uuid) returns void language sql as $$
  select pg_advisory_xact_lock(hashtextextended(ws::text, 0))
$$;

-- Comprueba que una hora sigue libre (misma regla que lib/domain/appointments.ts)
create or replace function public._check_slot(ws uuid, at timestamptz, exclude_appointment uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  tz text := public._ws_tz(ws);
  local_ts timestamp := at at time zone tz;
  t time := local_ts::time;
  rule public.workshop_availability;
  taken int;
begin
  if exists (select 1 from public.workshop_closures where workshop_id = ws and date = local_ts::date)
     or not exists (select 1 from public.workshop_availability
                    where workshop_id = ws and is_active and weekday = extract(dow from local_ts)) then
    raise exception using message = 'El taller no abre ese día. Elige otro, por favor.', errcode = 'TA001';
  end if;
  select * into rule from public.workshop_availability
  where workshop_id = ws and is_active and weekday = extract(dow from local_ts)
    and t >= start_time and t < end_time
    and extract(second from t) = 0
    and (extract(epoch from (t - start_time)) / 60)::int % slot_minutes = 0
    and t + make_interval(mins => slot_minutes) <= end_time
  limit 1;
  if not found then
    raise exception using message = 'Esa hora no está disponible. Elige otra, por favor.', errcode = 'TA001';
  end if;
  if at < now() + interval '60 minutes' then
    raise exception using message = 'Esa hora ya ha pasado. Elige otra, por favor.', errcode = 'TA001';
  end if;
  select count(*) into taken from public.appointments
  where workshop_id = ws and status <> 'cancelled'
    and scheduled_at >= at and scheduled_at < at + make_interval(mins => rule.slot_minutes)
    and (exclude_appointment is null or id <> exclude_appointment);
  if taken >= rule.capacity then
    raise exception using message = 'Esa hora acaba de completarse. Elige otra, por favor.', errcode = 'TA001';
  end if;
end $$;

-- Cambio de estado + historial + aviso al cliente, en un solo paso
create or replace function public._apply_status_change(repair uuid, target public.repair_status, actor uuid, note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.repair_orders;
  v text;
  title text;
  body text;
begin
  select * into r from public.repair_orders where id = repair for update;
  insert into public.repair_status_history (repair_order_id, from_status, to_status, changed_by, note)
  values (r.id, r.current_status, target, actor, note);
  update public.repair_orders set
    current_status = target,
    updated_at = now(),
    completed_at = case when target = 'ready_for_pickup' and r.current_status = 'repair_in_progress' then now() else completed_at end
  where id = r.id;
  if target = 'vehicle_received' and r.appointment_id is not null then
    update public.appointments set status = 'completed' where id = r.appointment_id;
  end if;

  v := public._vehicle_label(r.vehicle_id);
  case target
    when 'appointment_confirmed' then title := 'Cita confirmada'; body := 'Hemos confirmado la cita de tu ' || v || '.';
    when 'vehicle_received' then title := 'Vehículo recibido'; body := 'Tu ' || v || ' ya está en el taller.';
    when 'diagnosis' then title := 'Diagnóstico iniciado'; body := 'Estamos revisando tu ' || v || '.';
    when 'repair_in_progress' then title := 'Reparación iniciada'; body := 'Hemos empezado a reparar tu ' || v || '.';
    when 'ready_for_pickup' then title := '¡Listo para recoger!'; body := 'Ya puedes pasar a recoger tu ' || v || '.';
    else title := null;
  end case;
  if title is not null then
    perform public._notify(r.customer_id, r.id, 'status_changed', title, body);
  end if;
  -- Al entregar el coche, pedir reseña (si el taller tiene enlace)
  if target = 'closed' and r.current_status = 'ready_for_pickup'
     and exists (select 1 from public.workshops where id = r.workshop_id and review_url is not null) then
    perform public._notify(r.customer_id, r.id, 'review_request', '¿Qué tal ha ido?',
      'Gracias por confiar en nosotros. Si te ha gustado, déjanos tu opinión: nos ayuda mucho.');
  end if;
end $$;

create or replace function public._create_repair_for(appt public.appointments, actor uuid, note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  select id into rid from public.repair_orders where appointment_id = appt.id;
  if rid is not null then return rid; end if;
  insert into public.repair_orders (workshop_id, vehicle_id, customer_id, appointment_id, current_status)
  values (appt.workshop_id, appt.vehicle_id, appt.customer_id, appt.id, 'appointment_confirmed')
  returning id into rid;
  insert into public.repair_status_history (repair_order_id, from_status, to_status, changed_by, note)
  values (rid, null, 'appointment_confirmed', actor, note);
  return rid;
end $$;

-- =============================================================================
-- Vehículos
-- =============================================================================
create or replace function public.add_vehicle(p_plate text, p_format text, p_make text, p_model text, p_year int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles := public._me();
  v_key text := upper(regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_owner uuid;
  vid uuid;
begin
  if me.role <> 'customer' then perform public._fail('Solo los clientes pueden añadir sus vehículos.'); end if;
  if length(v_key) < 2 then perform public._fail('Escribe la matrícula'); end if;
  select customer_id into v_owner from public.vehicles where plate_key = v_key;
  if v_owner = me.id then perform public._fail('Ya tienes un vehículo con esa matrícula.'); end if;
  if v_owner is not null then
    perform public._fail('Esta matrícula ya está registrada en otra cuenta. Si el coche es tuyo, habla con el taller.');
  end if;
  insert into public.vehicles (customer_id, workshop_id, license_plate, plate_format, make, model, year)
  values (me.id, public._default_workshop(me), trim(p_plate), coalesce(p_format, 'es'), trim(p_make), trim(p_model), p_year)
  returning id into vid;
  return vid;
end $$;

-- =============================================================================
-- Citas
-- =============================================================================
create or replace function public.request_appointment(
  p_vehicle_id uuid, p_category text, p_description text, p_drivable public.drivable_status, p_scheduled_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles := public._me();
  v public.vehicles;
  ws uuid;
  aid uuid;
begin
  select * into v from public.vehicles where id = p_vehicle_id and customer_id = me.id;
  if not found then perform public._fail('Elige uno de tus vehículos.'); end if;
  if p_category not in ('averia', 'mantenimiento', 'testigo', 'ruido', 'otro') then perform public._fail('Elige un motivo'); end if;
  ws := coalesce(v.workshop_id, public._default_workshop(me));
  perform public._lock_workshop(ws);
  perform public._check_slot(ws, p_scheduled_at, null);
  insert into public.appointments (workshop_id, vehicle_id, customer_id, scheduled_at, status, issue_category, issue_description, drivable_status)
  values (ws, v.id, me.id, p_scheduled_at, 'requested', p_category, nullif(trim(coalesce(p_description, '')), ''), p_drivable)
  returning id into aid;
  perform public._notify_staff(ws, null, 'appointment_requested', 'Nueva solicitud de cita',
    me.full_name || ' · ' || v.make || ' ' || v.model || ' · ' || public._fmt(p_scheduled_at, public._ws_tz(ws)) || ' · ' || public._category_label(p_category));
  return aid;
end $$;

create or replace function public.add_appointment_media(p_appointment_id uuid, p_path text, p_type public.media_type)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles := public._me();
  a public.appointments;
  mid uuid;
begin
  select * into a from public.appointments where id = p_appointment_id and customer_id = me.id;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  if p_path not like a.workshop_id::text || '/appointments/' || a.id::text || '/%' then
    perform public._fail('Ruta de archivo no válida.');
  end if;
  if (select count(*) from public.appointment_media where appointment_id = a.id) >= 6 then
    perform public._fail('Puedes añadir hasta 6 archivos.');
  end if;
  insert into public.appointment_media (appointment_id, uploaded_by, storage_path, media_type)
  values (a.id, me.id, p_path, p_type) returning id into mid;
  return mid;
end $$;

create or replace function public.confirm_appointment(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  me public.profiles;
  rid uuid;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  me := public._require_staff(a.workshop_id);
  if a.status <> 'requested' then perform public._fail('Esta cita ya estaba gestionada.'); end if;
  update public.appointments set status = 'confirmed' where id = a.id;
  rid := public._create_repair_for(a, me.id, null);
  perform public._notify(a.customer_id, rid, 'appointment_confirmed', 'Cita confirmada',
    'Te esperamos el ' || public._fmt(a.scheduled_at, public._ws_tz(a.workshop_id)) || ' con tu ' || public._vehicle_label(a.vehicle_id) || '.');
  return rid;
end $$;

create or replace function public.decline_appointment(p_id uuid, p_reason text, p_proposed_at timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  perform public._require_staff(a.workshop_id);
  if a.status <> 'requested' then perform public._fail('Esta solicitud ya estaba gestionada.'); end if;
  if p_proposed_at is not null then
    perform public._lock_workshop(a.workshop_id);
    begin
      perform public._check_slot(a.workshop_id, p_proposed_at, a.id);
    exception when sqlstate 'TA001' then
      raise exception using message = 'No se puede proponer esa hora: ' || sqlerrm, errcode = 'TA001';
    end;
  end if;
  update public.appointments set status = 'cancelled', cancelled_by = 'workshop', cancellation_reason = reason,
    customer_dismissed_at = null, proposed_at = p_proposed_at
  where id = a.id;
  if p_proposed_at is not null then
    perform public._notify(a.customer_id, null, 'appointment_cancelled', 'El taller te propone otra hora',
      coalesce(reason || ' ', '') || 'Te proponemos el ' || public._fmt(p_proposed_at, public._ws_tz(a.workshop_id)) || '. Acéptala o elige otra desde la app.');
  else
    perform public._notify(a.customer_id, null, 'appointment_cancelled', 'No podemos atenderte a esa hora',
      coalesce(reason, 'Elige otra hora para tu cita.') || ' Puedes elegir otra fecha desde la app.');
  end if;
end $$;

create or replace function public.accept_proposed_time(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  me public.profiles;
  rid uuid;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  me := public._require_customer(a.customer_id);
  if a.status <> 'cancelled' or a.cancelled_by is distinct from 'workshop' or a.proposed_at is null then
    perform public._fail('Esta propuesta ya no está disponible.');
  end if;
  perform public._lock_workshop(a.workshop_id);
  begin
    perform public._check_slot(a.workshop_id, a.proposed_at, a.id);
  exception when sqlstate 'TA001' then
    raise exception using message = 'Esa hora ya no está libre. Elige otra, por favor.', errcode = 'TA001';
  end;
  update public.appointments set scheduled_at = proposed_at, status = 'confirmed', cancelled_by = null,
    cancellation_reason = null, proposed_at = null
  where id = a.id returning * into a;
  rid := public._create_repair_for(a, me.id, 'El cliente aceptó la hora propuesta por el taller');
  perform public._notify_staff(a.workshop_id, rid, 'appointment_confirmed', 'Hora propuesta aceptada',
    me.full_name || ' · ' || public._vehicle_label(a.vehicle_id) || ' · ' || public._fmt(a.scheduled_at, public._ws_tz(a.workshop_id)));
  return rid;
end $$;

create or replace function public.cancel_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  me public.profiles;
  r public.repair_orders;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  me := public._require_customer(a.customer_id);
  if a.status not in ('requested', 'confirmed') then perform public._fail('Esta cita ya no se puede anular.'); end if;
  select * into r from public.repair_orders where appointment_id = a.id;
  if found and r.current_status <> 'appointment_confirmed' then
    perform public._fail('El coche ya está en el taller: habla con ellos para cualquier cambio.');
  end if;
  update public.appointments set status = 'cancelled', cancelled_by = 'customer' where id = a.id;
  if r.id is not null then
    perform public._apply_status_change(r.id, 'closed', me.id, 'Cita anulada por el cliente');
  end if;
  perform public._notify_staff(a.workshop_id, r.id, 'appointment_cancelled', 'Cita anulada por el cliente',
    me.full_name || ' · ' || public._vehicle_label(a.vehicle_id) || ' · ' || public._fmt(a.scheduled_at, public._ws_tz(a.workshop_id)));
end $$;

create or replace function public.reschedule_declined_appointment(p_id uuid, p_scheduled_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  me public.profiles;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  me := public._require_customer(a.customer_id);
  if a.status <> 'cancelled' or a.cancelled_by is distinct from 'workshop' then
    perform public._fail('Esta cita ya no se puede reprogramar.');
  end if;
  perform public._lock_workshop(a.workshop_id);
  perform public._check_slot(a.workshop_id, p_scheduled_at, a.id);
  update public.appointments set status = 'requested', scheduled_at = p_scheduled_at, cancelled_by = null,
    cancellation_reason = null, customer_dismissed_at = null, proposed_at = null
  where id = a.id;
  perform public._notify_staff(a.workshop_id, null, 'appointment_requested', 'Nueva hora propuesta',
    me.full_name || ' · ' || public._vehicle_label(a.vehicle_id) || ' · ' || public._fmt(p_scheduled_at, public._ws_tz(a.workshop_id)));
end $$;

create or replace function public.reschedule_confirmed_appointment(p_id uuid, p_scheduled_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.appointments;
  me public.profiles;
  r public.repair_orders;
begin
  select * into a from public.appointments where id = p_id for update;
  if not found then perform public._fail('No encontramos esta cita.'); end if;
  me := public._require_customer(a.customer_id);
  select * into r from public.repair_orders where appointment_id = a.id;
  if a.status <> 'confirmed' or (r.id is not null and r.current_status <> 'appointment_confirmed') then
    perform public._fail('Esta cita ya no se puede cambiar. Habla con el taller.');
  end if;
  perform public._lock_workshop(a.workshop_id);
  perform public._check_slot(a.workshop_id, p_scheduled_at, a.id);
  update public.appointments set scheduled_at = p_scheduled_at where id = a.id;
  if r.id is not null then update public.repair_orders set updated_at = now() where id = r.id; end if;
  perform public._notify_staff(a.workshop_id, r.id, 'appointment_rescheduled', 'Cita cambiada por el cliente',
    me.full_name || ' · ' || public._vehicle_label(a.vehicle_id) || ' · de ' || public._fmt(a.scheduled_at, public._ws_tz(a.workshop_id))
    || ' a ' || public._fmt(p_scheduled_at, public._ws_tz(a.workshop_id)));
end $$;

create or replace function public.dismiss_declined_appointment(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_id;
  if not found then return; end if;
  perform public._require_customer(a.customer_id);
  update public.appointments set customer_dismissed_at = now() where id = a.id;
end $$;

-- =============================================================================
-- Estados de reparación
-- =============================================================================
create or replace function public.change_repair_status(
  p_repair_id uuid, p_to public.repair_status, p_note text default null,
  p_manual boolean default false, p_without_estimate boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.repair_orders;
  me public.profiles;
  latest public.estimate_status;
  allowed boolean;
  note text;
begin
  select * into r from public.repair_orders where id = p_repair_id for update;
  if not found then perform public._fail('No encontramos esta reparación.'); end if;
  me := public._require_staff(r.workshop_id);
  if r.current_status = p_to then return; end if;

  select status into latest from public.estimates
  where repair_order_id = r.id and status <> 'draft' order by version desc limit 1;

  if not p_manual then
    -- Solo el siguiente paso lógico (las correcciones van por "manual")
    allowed := (r.current_status, p_to) in (
      ('appointment_confirmed'::public.repair_status, 'vehicle_received'::public.repair_status),
      ('vehicle_received', 'diagnosis'),
      ('estimate_pending', 'repair_in_progress'),
      ('repair_in_progress', 'ready_for_pickup'),
      ('ready_for_pickup', 'closed')
    )
    or (r.current_status = 'diagnosis' and p_to = 'repair_in_progress' and p_without_estimate)
    or (r.current_status = 'estimate_pending' and p_to = 'ready_for_pickup' and latest = 'rejected');
    if not allowed then perform public._fail('Ese cambio de estado no es posible ahora. Usa «Corregir estado».'); end if;
    if p_to = 'repair_in_progress' and not p_without_estimate and latest is distinct from 'accepted' then
      perform public._fail('El cliente todavía no ha aceptado el presupuesto.');
    end if;
  end if;

  note := case when p_manual then 'Corrección manual' || coalesce(': ' || nullif(trim(p_note), ''), '')
               else nullif(trim(coalesce(p_note, '')), '') end;
  perform public._apply_status_change(r.id, p_to, me.id, note);
end $$;

create or replace function public.set_estimated_ready_at(p_repair_id uuid, p_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.repair_orders;
begin
  select * into r from public.repair_orders where id = p_repair_id for update;
  if not found then perform public._fail('No encontramos esta reparación.'); end if;
  perform public._require_staff(r.workshop_id);
  if r.estimated_ready_at is not distinct from p_at then return; end if;
  update public.repair_orders set estimated_ready_at = p_at, updated_at = now() where id = r.id;
  if r.current_status <> 'closed' then
    if p_at is not null then
      perform public._notify(r.customer_id, r.id, 'estimated_ready_changed', 'Nueva fecha estimada',
        'Tu ' || public._vehicle_label(r.vehicle_id) || ' estará listo aproximadamente el ' || public._fmt(p_at, public._ws_tz(r.workshop_id)) || '.');
    else
      perform public._notify(r.customer_id, r.id, 'estimated_ready_changed', 'Fecha estimada retirada',
        'El taller te avisará cuando tenga una nueva fecha para tu ' || public._vehicle_label(r.vehicle_id) || '.');
    end if;
  end if;
end $$;

-- =============================================================================
-- Presupuestos
-- =============================================================================
create or replace function public._recalc_estimate(est uuid) returns void
language sql security definer set search_path = '' as $$
  update public.estimates e set
    subtotal = s.subtotal,
    tax_amount = round(s.subtotal * e.tax_rate / 100, 2),
    total = s.subtotal + round(s.subtotal * e.tax_rate / 100, 2),
    updated_at = now()
  from (select coalesce(sum(total), 0) as subtotal from public.estimate_items where estimate_id = est) s
  where e.id = est
$$;

create or replace function public._write_estimate_draft(p_estimate_id uuid, p_items jsonb, p_tax_rate numeric, p_eta timestamptz)
returns public.estimates language plpgsql security definer set search_path = '' as $$
declare
  e public.estimates;
  item jsonb;
  n int := 0;
begin
  select * into e from public.estimates where id = p_estimate_id for update;
  if not found then perform public._fail('No encontramos este presupuesto.'); end if;
  perform public._require_staff(e.workshop_id);
  if e.status <> 'draft' then
    perform public._fail('Este presupuesto ya se envió. Crea una nueva versión para modificarlo.');
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    perform public._fail('Añade al menos una línea');
  end if;
  if p_tax_rate is null or p_tax_rate < 0 or p_tax_rate > 100 then perform public._fail('IVA no válido'); end if;

  delete from public.estimate_items where estimate_id = e.id;
  for item in
    select value from jsonb_array_elements(p_items) with ordinality
    order by array_position(array['work', 'part', 'labor'], value ->> 'type'), ordinality
  loop
    if coalesce(trim(item ->> 'description'), '') = '' then perform public._fail('Describe la línea'); end if;
    if (item ->> 'quantity')::numeric <= 0 then perform public._fail('Cantidad: Mayor que 0'); end if;
    if (item ->> 'unit_price')::numeric < 0 then perform public._fail('Precio: No puede ser negativo'); end if;
    insert into public.estimate_items (estimate_id, type, description, quantity, unit_price, total, sort_order)
    values (
      e.id, (item ->> 'type')::public.estimate_item_type, trim(item ->> 'description'),
      (item ->> 'quantity')::numeric, (item ->> 'unit_price')::numeric,
      round((item ->> 'quantity')::numeric * (item ->> 'unit_price')::numeric, 2), n
    );
    n := n + 1;
  end loop;
  update public.estimates set tax_rate = p_tax_rate, estimated_ready_at = p_eta where id = e.id;
  perform public._recalc_estimate(e.id);
  select * into e from public.estimates where id = e.id;
  return e;
end $$;

create or replace function public.get_or_create_draft_estimate(p_repair_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.repair_orders;
  latest public.estimates;
  eid uuid;
begin
  select * into r from public.repair_orders where id = p_repair_id for update;
  if not found then perform public._fail('No encontramos esta reparación.'); end if;
  perform public._require_staff(r.workshop_id);
  select * into latest from public.estimates where repair_order_id = r.id order by version desc limit 1;
  if found and latest.status = 'draft' then return latest.id; end if;
  insert into public.estimates (workshop_id, repair_order_id, status, tax_rate, estimated_ready_at, version)
  values (r.workshop_id, r.id, 'draft', coalesce(latest.tax_rate, 21),
          coalesce(latest.estimated_ready_at, r.estimated_ready_at), coalesce(latest.version, 0) + 1)
  returning id into eid;
  if latest.id is not null then
    insert into public.estimate_items (estimate_id, type, description, quantity, unit_price, total, sort_order)
    select eid, type, description, quantity, unit_price, total, sort_order from public.estimate_items where estimate_id = latest.id;
  end if;
  perform public._recalc_estimate(eid);
  return eid;
end $$;

create or replace function public.save_estimate_draft(p_estimate_id uuid, p_items jsonb, p_tax_rate numeric, p_eta timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._write_estimate_draft(p_estimate_id, p_items, p_tax_rate, p_eta);
end $$;

create or replace function public.send_estimate(p_estimate_id uuid, p_items jsonb, p_tax_rate numeric, p_eta timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.estimates;
  r public.repair_orders;
  me public.profiles;
begin
  e := public._write_estimate_draft(p_estimate_id, p_items, p_tax_rate, p_eta);
  me := public._require_staff(e.workshop_id);
  select * into r from public.repair_orders where id = e.repair_order_id for update;
  update public.estimates set status = 'sent', sent_at = now(), updated_at = now() where id = e.id;
  update public.repair_orders set estimated_ready_at = e.estimated_ready_at where id = r.id;
  if r.current_status = 'estimate_pending' then
    perform public._apply_status_change(r.id, 'estimate_pending', me.id, 'Presupuesto v' || e.version || ' enviado');
  else
    perform public._apply_status_change(r.id, 'estimate_pending', me.id, null);
  end if;
  perform public._notify(r.customer_id, r.id, 'estimate_sent',
    case when e.version > 1 then 'Presupuesto actualizado' else 'Tienes un presupuesto' end,
    'Revisa el presupuesto de tu ' || public._vehicle_label(r.vehicle_id) || '.');
end $$;

create or replace function public.respond_estimate(p_estimate_id uuid, p_response text, p_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.estimates;
  r public.repair_orders;
  me public.profiles;
  newer boolean;
  awaiting boolean;
  changed_mind boolean;
  v text;
  msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  select * into e from public.estimates where id = p_estimate_id for update;
  if not found then perform public._fail('No encontramos este presupuesto.'); end if;
  select * into r from public.repair_orders where id = e.repair_order_id;
  me := public._require_customer(r.customer_id);
  newer := exists (select 1 from public.estimates where repair_order_id = r.id and version > e.version and status <> 'draft');
  awaiting := r.current_status = 'estimate_pending';
  if p_response = 'accept' then
    if newer or not awaiting or e.status not in ('sent', 'question', 'rejected') then
      perform public._fail('Este presupuesto ya no admite respuesta.');
    end if;
  elsif p_response in ('reject', 'question', 'talk') then
    if newer or not awaiting or e.status not in ('sent', 'question') then
      perform public._fail('Este presupuesto ya no admite respuesta.');
    end if;
  else
    perform public._fail('Respuesta no válida.');
  end if;

  changed_mind := p_response = 'accept' and e.status = 'rejected';
  v := public._vehicle_label(r.vehicle_id);

  if p_response = 'accept' then
    update public.estimates set status = 'accepted', accepted_at = now(), updated_at = now() where id = e.id;
    if changed_mind then
      insert into public.messages (workshop_id, customer_id, repair_order_id, sender_id, body)
      values (r.workshop_id, r.customer_id, r.id, me.id, 'He cambiado de opinión: acepto el presupuesto.');
    end if;
    perform public._notify_staff(r.workshop_id, r.id, 'estimate_accepted',
      case when changed_mind then 'El cliente ha cambiado de opinión' else 'Presupuesto aceptado' end,
      me.full_name || ' ha aceptado el presupuesto v' || e.version || ' · ' || v);
  elsif p_response = 'reject' then
    update public.estimates set status = 'rejected', rejected_at = now(), updated_at = now() where id = e.id;
    if msg is not null then
      insert into public.messages (workshop_id, customer_id, repair_order_id, sender_id, body)
      values (r.workshop_id, r.customer_id, r.id, me.id, msg);
    end if;
    perform public._notify_staff(r.workshop_id, r.id, 'estimate_rejected', 'Presupuesto rechazado',
      me.full_name || ' no quiere realizar la reparación · ' || v);
  else
    update public.estimates set status = 'question', updated_at = now() where id = e.id;
    insert into public.messages (workshop_id, customer_id, repair_order_id, sender_id, body)
    values (r.workshop_id, r.customer_id, r.id, me.id,
      coalesce(msg, case when p_response = 'talk'
        then 'Me gustaría hablar con el taller sobre el presupuesto. ¿Podéis llamarme?'
        else 'Tengo una duda sobre el presupuesto.' end));
    perform public._notify_staff(r.workshop_id, r.id, 'estimate_question',
      case when p_response = 'talk' then 'El cliente quiere hablar' else 'Consulta sobre presupuesto' end,
      me.full_name || ' · ' || v);
  end if;
end $$;

-- =============================================================================
-- Mensajes y avisos
-- =============================================================================
create or replace function public.send_message(p_customer_id uuid, p_repair_id uuid, p_body text, p_attachment_path text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles := public._me();
  staff boolean := me.role <> 'customer';
  customer public.profiles;
  r public.repair_orders;
  ws uuid;
  body text := trim(coalesce(p_body, ''));
  mid uuid;
  preview text;
begin
  if body = '' and p_attachment_path is null then perform public._fail('Escribe un mensaje.'); end if;
  if length(body) > 2000 then perform public._fail('El mensaje es demasiado largo.'); end if;
  select * into customer from public.profiles where id = p_customer_id and role = 'customer';
  if not found then perform public._fail('No encontramos a este cliente.'); end if;
  if p_repair_id is not null then
    select * into r from public.repair_orders where id = p_repair_id;
    if not found or r.customer_id <> p_customer_id then perform public._fail('Esta conversación no es de este cliente.'); end if;
    ws := r.workshop_id;
  else
    ws := case when staff then me.workshop_id else public._default_workshop(me) end;
  end if;
  if staff then perform public._require_staff(ws);
  else perform public._require_customer(p_customer_id); end if;
  if p_attachment_path is not null and p_attachment_path not like ws::text || '/messages/' || p_customer_id::text || '/%' then
    perform public._fail('Ruta de archivo no válida.');
  end if;

  insert into public.messages (workshop_id, customer_id, repair_order_id, sender_id, body, attachment_path)
  values (ws, p_customer_id, p_repair_id, me.id, body, p_attachment_path) returning id into mid;

  preview := case when body = '' then '📷 Foto' when length(body) > 80 then left(body, 77) || '…' else body end;
  if staff then
    perform public._notify(p_customer_id, p_repair_id, 'message', 'Mensaje del taller', preview);
  else
    perform public._notify_staff(ws, p_repair_id, 'message',
      case when p_repair_id is null then 'Nueva consulta de ' else 'Nuevo mensaje de ' end || me.full_name, preview);
  end if;
  return mid;
end $$;

create or replace function public.mark_messages_read(p_customer_id uuid, p_repair_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles := public._me();
  staff boolean := me.role <> 'customer';
begin
  if not staff and me.id <> p_customer_id then return; end if;
  update public.messages m set read_at = now()
  from public.profiles s
  where s.id = m.sender_id
    and m.customer_id = p_customer_id
    and m.repair_order_id is not distinct from p_repair_id
    and m.read_at is null
    and (s.role <> 'customer') <> staff
    and (not staff or m.workshop_id = me.workshop_id);
  update public.notifications set read_at = now()
  where user_id = me.id and type = 'message' and read_at is null and repair_order_id is not distinct from p_repair_id;
end $$;

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- =============================================================================
-- Horario, días cerrados y datos del taller
-- =============================================================================
create or replace function public.save_workshop_schedule(p_workshop_id uuid, p_slot_minutes int, p_days jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  d jsonb;
  rg jsonb;
  outside int;
  tz text := public._ws_tz(p_workshop_id);
begin
  perform public._require_staff(p_workshop_id);
  if p_slot_minutes not in (15, 30, 60) then perform public._fail('Duración de franja no válida.'); end if;
  delete from public.workshop_availability where workshop_id = p_workshop_id;
  for d in select value from jsonb_array_elements(p_days) loop
    if coalesce((d ->> 'open')::boolean, false) then
      for rg in select value from jsonb_array_elements(d -> 'ranges') loop
        insert into public.workshop_availability (workshop_id, weekday, start_time, end_time, slot_minutes, capacity, is_active)
        values (p_workshop_id, (d ->> 'weekday')::smallint, (rg ->> 'start')::time, (rg ->> 'end')::time,
                p_slot_minutes, (rg ->> 'capacity')::smallint, true);
      end loop;
    end if;
  end loop;
  -- tramos solapados en un mismo día
  if exists (
    select 1 from public.workshop_availability a join public.workshop_availability b
      on a.workshop_id = b.workshop_id and a.weekday = b.weekday and a.id <> b.id
     and a.start_time < b.end_time and b.start_time < a.end_time
    where a.workshop_id = p_workshop_id
  ) then
    perform public._fail('Hay tramos que se solapan.');
  end if;
  select count(*) into outside from public.appointments ap
  where ap.workshop_id = p_workshop_id and ap.status in ('requested', 'confirmed') and ap.scheduled_at > now()
    and not exists (
      select 1 from public.workshop_availability w
      where w.workshop_id = p_workshop_id
        and w.weekday = extract(dow from ap.scheduled_at at time zone tz)
        and (ap.scheduled_at at time zone tz)::time >= w.start_time
        and (ap.scheduled_at at time zone tz)::time < w.end_time
    );
  return outside;
end $$;

create or replace function public.add_workshop_closure(p_workshop_id uuid, p_date date, p_reason text)
returns int language plpgsql security definer set search_path = '' as $$
declare
  tz text := public._ws_tz(p_workshop_id);
  affected int;
begin
  perform public._require_staff(p_workshop_id);
  if p_date is null then perform public._fail('Elige una fecha.'); end if;
  if p_date < (now() at time zone tz)::date then perform public._fail('No puedes cerrar un día que ya ha pasado.'); end if;
  if exists (select 1 from public.workshop_closures where workshop_id = p_workshop_id and date = p_date) then
    perform public._fail('Ese día ya está marcado como cerrado.');
  end if;
  insert into public.workshop_closures (workshop_id, date, reason) values (p_workshop_id, p_date, nullif(trim(coalesce(p_reason, '')), ''));
  select count(*) into affected from public.appointments
  where workshop_id = p_workshop_id and status in ('requested', 'confirmed') and (scheduled_at at time zone tz)::date = p_date;
  return affected;
end $$;

create or replace function public.remove_workshop_closure(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.workshop_closures;
begin
  select * into c from public.workshop_closures where id = p_id;
  if not found then return; end if;
  perform public._require_staff(c.workshop_id);
  delete from public.workshop_closures where id = c.id;
end $$;

create or replace function public.update_workshop_profile(
  p_workshop_id uuid, p_name text, p_phone text, p_email text, p_address text, p_review_url text
) returns void language plpgsql security definer set search_path = '' as $$
declare me public.profiles;
begin
  me := public._require_staff(p_workshop_id);
  if me.role <> 'workshop_admin' then perform public._fail('Solo el administrador puede cambiar los datos del taller.'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 then perform public._fail('Escribe el nombre del taller.'); end if;
  if nullif(trim(coalesce(p_review_url, '')), '') is not null and p_review_url !~* '^https?://' then
    perform public._fail('El enlace de reseñas debe empezar por https://');
  end if;
  update public.workshops set name = trim(p_name), phone = trim(coalesce(p_phone, '')), email = trim(coalesce(p_email, '')),
    address = trim(coalesce(p_address, '')), review_url = nullif(trim(coalesce(p_review_url, '')), '')
  where id = p_workshop_id;
end $$;

-- -----------------------------------------------------------------------------
-- Permisos: las ayudas internas no se pueden llamar desde la API
-- -----------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like '\_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
  -- Las RPC de negocio requieren sesión
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'add_vehicle', 'request_appointment', 'add_appointment_media', 'confirm_appointment', 'decline_appointment',
      'accept_proposed_time', 'cancel_appointment', 'reschedule_declined_appointment', 'reschedule_confirmed_appointment',
      'dismiss_declined_appointment', 'change_repair_status', 'set_estimated_ready_at', 'get_or_create_draft_estimate',
      'save_estimate_draft', 'send_estimate', 'respond_estimate', 'send_message', 'mark_messages_read',
      'mark_notifications_read', 'save_workshop_schedule', 'add_workshop_closure', 'remove_workshop_closure',
      'update_workshop_profile'
    )
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
