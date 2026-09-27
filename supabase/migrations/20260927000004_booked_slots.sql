-- =============================================================================
-- Ocupación pública de franjas
--
-- Un cliente solo puede ver SUS citas (RLS), pero su calendario necesita saber
-- qué franjas están llenas. Esta tabla guarda solo "hay una reserva a esta
-- hora" (sin cliente, coche ni motivo), la mantiene la propia base de datos y
-- avisa en tiempo real a todos cuando cambia.
-- =============================================================================
create table public.booked_slots (
  appointment_id uuid primary key references public.appointments (id) on delete cascade,
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  scheduled_at timestamptz not null
);
create index booked_slots_ws_time_idx on public.booked_slots (workshop_id, scheduled_at);

alter table public.booked_slots enable row level security;
create policy "ocupación pública" on public.booked_slots for select to anon, authenticated using (true);

create or replace function public._sync_booked_slot()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'cancelled' then
    delete from public.booked_slots where appointment_id = new.id;
  else
    insert into public.booked_slots (appointment_id, workshop_id, scheduled_at)
    values (new.id, new.workshop_id, new.scheduled_at)
    on conflict (appointment_id) do update set workshop_id = excluded.workshop_id, scheduled_at = excluded.scheduled_at;
  end if;
  return new;
end $$;
revoke execute on function public._sync_booked_slot() from public, anon, authenticated;

create trigger appointments_booked_slots
  after insert or update of status, scheduled_at, workshop_id on public.appointments
  for each row execute function public._sync_booked_slot();

insert into public.booked_slots (appointment_id, workshop_id, scheduled_at)
select id, workshop_id, scheduled_at from public.appointments where status <> 'cancelled'
on conflict do nothing;

alter publication supabase_realtime add table public.booked_slots;
