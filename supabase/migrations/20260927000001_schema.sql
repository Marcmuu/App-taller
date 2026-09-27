-- =============================================================================
-- App Taller · Esquema
-- Modelo: 02_MODELO_DATOS.md (con los cambios posteriores: capacidad por
-- franja, días cerrados, fecha estimada, conversación general, etc.)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('customer', 'workshop_admin', 'mechanic');
create type public.appointment_status as enum ('requested', 'confirmed', 'cancelled', 'completed');
create type public.drivable_status as enum ('yes', 'no', 'unknown');
create type public.media_type as enum ('image', 'video');
create type public.repair_status as enum (
  'appointment_confirmed', 'vehicle_received', 'diagnosis', 'estimate_pending',
  'repair_in_progress', 'ready_for_pickup', 'closed'
);
create type public.estimate_status as enum ('draft', 'sent', 'accepted', 'rejected', 'question');
create type public.estimate_item_type as enum ('work', 'part', 'labor');
create type public.cancelled_by as enum ('customer', 'workshop');

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  slug text not null unique,
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  review_url text check (review_url is null or review_url ~* '^https?://'),
  timezone text not null default 'Europe/Madrid',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  phone text not null default '',
  role public.user_role not null default 'customer',
  workshop_id uuid references public.workshops (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint staff_has_workshop check (role = 'customer' or workshop_id is not null)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  workshop_id uuid references public.workshops (id) on delete set null,
  license_plate text not null check (length(license_plate) between 2 and 15),
  plate_format text not null default 'es',
  -- Matrícula sin separadores para detectar duplicados ("1234 BCD" = "1234-bcd")
  plate_key text generated always as (upper(regexp_replace(license_plate, '[^A-Za-z0-9]', '', 'g'))) stored,
  make text not null check (length(make) between 1 and 60),
  model text not null check (length(model) between 1 and 60),
  year int check (year is null or year between 1950 and 2100),
  vin text,
  created_at timestamptz not null default now()
);
create unique index vehicles_plate_key_idx on public.vehicles (plate_key);
create index vehicles_customer_idx on public.vehicles (customer_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'requested',
  issue_category text,
  issue_description text check (issue_description is null or length(issue_description) <= 1200),
  drivable_status public.drivable_status,
  cancelled_by public.cancelled_by,
  cancellation_reason text check (cancellation_reason is null or length(cancellation_reason) <= 500),
  customer_dismissed_at timestamptz,
  proposed_at timestamptz,
  created_at timestamptz not null default now()
);
create index appointments_workshop_time_idx on public.appointments (workshop_id, scheduled_at);
create index appointments_customer_idx on public.appointments (customer_id);

create table public.appointment_media (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  media_type public.media_type not null,
  created_at timestamptz not null default now()
);
create index appointment_media_appt_idx on public.appointment_media (appointment_id);

create table public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  appointment_id uuid unique references public.appointments (id) on delete set null,
  current_status public.repair_status not null default 'appointment_confirmed',
  opened_at timestamptz not null default now(),
  completed_at timestamptz,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index repair_orders_workshop_status_idx on public.repair_orders (workshop_id, current_status);
create index repair_orders_customer_idx on public.repair_orders (customer_id);

create table public.repair_status_history (
  id uuid primary key default gen_random_uuid(),
  repair_order_id uuid not null references public.repair_orders (id) on delete cascade,
  from_status public.repair_status,
  to_status public.repair_status not null,
  changed_by uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
create index repair_status_history_repair_idx on public.repair_status_history (repair_order_id, created_at);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  repair_order_id uuid not null references public.repair_orders (id) on delete cascade,
  status public.estimate_status not null default 'draft',
  subtotal numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 21 check (tax_rate between 0 and 100),
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  estimated_ready_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (repair_order_id, version)
);

create table public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  type public.estimate_item_type not null,
  description text not null check (length(description) between 1 and 200),
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total numeric(12, 2) not null,
  sort_order int not null default 0
);
create index estimate_items_estimate_idx on public.estimate_items (estimate_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  repair_order_id uuid references public.repair_orders (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (length(body) <= 2000),
  attachment_path text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint message_not_empty check (body <> '' or attachment_path is not null)
);
create index messages_thread_idx on public.messages (customer_id, repair_order_id, created_at);
create index messages_workshop_idx on public.messages (workshop_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  repair_order_id uuid references public.repair_orders (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.workshop_availability (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 30 check (slot_minutes in (15, 30, 60)),
  capacity smallint not null default 1 check (capacity between 1 and 20),
  is_active boolean not null default true,
  check (end_time > start_time)
);
create index workshop_availability_ws_idx on public.workshop_availability (workshop_id, weekday);

create table public.workshop_closures (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (workshop_id, date)
);

-- Ajustes de la instalación (p. ej. si está en modo demo)
create table public.app_settings (
  key text primary key,
  value text not null
);

-- -----------------------------------------------------------------------------
-- Funciones de ayuda para las políticas (security definer: leen profiles sin
-- entrar en bucle con su propia política)
-- -----------------------------------------------------------------------------
create or replace function public.my_workshop_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select workshop_id from public.profiles where id = auth.uid() and role <> 'customer'
$$;

create or replace function public.is_staff_of(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role <> 'customer' and workshop_id = ws
  )
$$;

create or replace function public.try_uuid(value text)
returns uuid language plpgsql immutable as $$
begin
  return value::uuid;
exception when others then
  return null;
end $$;

-- -----------------------------------------------------------------------------
-- Alta de usuarios: todo registro nuevo es cliente (el rol nunca lo decide
-- el propio usuario). Los empleados los da de alta el taller.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- Regla general: se puede LEER lo propio (cliente) o lo del propio taller
-- (empleados). Las ESCRITURAS se hacen con las funciones RPC (security
-- definer) que comprueban permisos y reglas de negocio; no hay políticas de
-- insert/update/delete directas salvo lo imprescindible.
-- =============================================================================
alter table public.workshops enable row level security;
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_media enable row level security;
alter table public.repair_orders enable row level security;
alter table public.repair_status_history enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.workshop_availability enable row level security;
alter table public.workshop_closures enable row level security;
alter table public.app_settings enable row level security;

-- Información pública del taller y su horario (para reservar)
create policy "talleres públicos" on public.workshops for select to anon, authenticated using (true);
create policy "horario público" on public.workshop_availability for select to anon, authenticated using (true);
create policy "cierres públicos" on public.workshop_closures for select to anon, authenticated using (true);
create policy "ajustes públicos" on public.app_settings for select to anon, authenticated using (true);

-- Perfiles: el propio; los compañeros del taller; los clientes que tienen
-- relación con el taller; y los empleados son visibles para sus clientes.
create policy "perfil propio" on public.profiles for select to authenticated using (id = auth.uid());
create policy "empleados visibles" on public.profiles for select to authenticated using (role <> 'customer');
create policy "clientes del taller" on public.profiles for select to authenticated using (
  role = 'customer' and public.my_workshop_id() is not null and (
    exists (select 1 from public.vehicles v where v.customer_id = profiles.id and v.workshop_id = public.my_workshop_id())
    or exists (select 1 from public.appointments a where a.customer_id = profiles.id and a.workshop_id = public.my_workshop_id())
    or exists (select 1 from public.messages m where m.customer_id = profiles.id and m.workshop_id = public.my_workshop_id())
  )
);

create policy "vehículos" on public.vehicles for select to authenticated using (
  customer_id = auth.uid() or public.is_staff_of(workshop_id)
);
create policy "citas" on public.appointments for select to authenticated using (
  customer_id = auth.uid() or public.is_staff_of(workshop_id)
);
create policy "multimedia de citas" on public.appointment_media for select to authenticated using (
  exists (
    select 1 from public.appointments a
    where a.id = appointment_media.appointment_id
      and (a.customer_id = auth.uid() or public.is_staff_of(a.workshop_id))
  )
);
create policy "reparaciones" on public.repair_orders for select to authenticated using (
  customer_id = auth.uid() or public.is_staff_of(workshop_id)
);
create policy "historial" on public.repair_status_history for select to authenticated using (
  exists (
    select 1 from public.repair_orders r
    where r.id = repair_status_history.repair_order_id
      and (r.customer_id = auth.uid() or public.is_staff_of(r.workshop_id))
  )
);
-- El cliente nunca ve borradores de presupuesto
create policy "presupuestos" on public.estimates for select to authenticated using (
  public.is_staff_of(workshop_id)
  or (status <> 'draft' and exists (
    select 1 from public.repair_orders r where r.id = estimates.repair_order_id and r.customer_id = auth.uid()
  ))
);
create policy "líneas de presupuesto" on public.estimate_items for select to authenticated using (
  exists (
    select 1 from public.estimates e
    join public.repair_orders r on r.id = e.repair_order_id
    where e.id = estimate_items.estimate_id
      and (public.is_staff_of(e.workshop_id) or (e.status <> 'draft' and r.customer_id = auth.uid()))
  )
);
create policy "mensajes" on public.messages for select to authenticated using (
  customer_id = auth.uid() or public.is_staff_of(workshop_id)
);
create policy "avisos propios" on public.notifications for select to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Realtime: cambios de estas tablas llegan a los clientes (respetando RLS)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.workshops, public.profiles, public.vehicles, public.appointments,
  public.appointment_media, public.repair_orders, public.repair_status_history,
  public.estimates, public.estimate_items, public.messages, public.notifications,
  public.workshop_availability, public.workshop_closures;

-- -----------------------------------------------------------------------------
-- Storage: bucket privado para fotos y vídeos
-- Rutas: {workshop_id}/appointments/{appointment_id}/{archivo}
--        {workshop_id}/messages/{customer_id}/{archivo}
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-media', 'repair-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

create or replace function public.can_access_media(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    public.is_staff_of(public.try_uuid(split_part(object_name, '/', 1)))
    or (
      split_part(object_name, '/', 2) = 'appointments'
      and exists (
        select 1 from public.appointments a
        where a.id = public.try_uuid(split_part(object_name, '/', 3))
          and a.workshop_id = public.try_uuid(split_part(object_name, '/', 1))
          and a.customer_id = auth.uid()
      )
    )
    or (
      split_part(object_name, '/', 2) = 'messages'
      and public.try_uuid(split_part(object_name, '/', 3)) = auth.uid()
    )
$$;

create policy "leer multimedia autorizada" on storage.objects for select to authenticated
  using (bucket_id = 'repair-media' and public.can_access_media(name));
create policy "subir multimedia autorizada" on storage.objects for insert to authenticated
  with check (bucket_id = 'repair-media' and public.can_access_media(name));
