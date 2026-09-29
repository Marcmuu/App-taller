-- =============================================================================
-- Notificaciones en el móvil (Web Push)
--
-- 1. Cada móvil/navegador que activa los avisos guarda aquí su suscripción.
-- 2. Al crearse un aviso (tabla notifications), un trigger llama a la función
--    send-push (supabase/functions/send-push) mediante pg_net.
-- 3. send-push lo envía al servicio push de Apple/Google y llega aunque la app
--    esté cerrada.
--
-- La URL de la función y el secreto compartido se guardan en Vault
-- (npm run db:demo -- push-setup <url> <secreto>). Sin configurar, no se
-- envía nada y la app funciona igual.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  constraint push_endpoint_https check (endpoint like 'https://%')
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "suscripciones propias" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());

-- Guarda (o reasigna al usuario actual) la suscripción de este dispositivo.
-- Si en el mismo móvil entra otra persona, el dispositivo pasa a ser suyo.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Inicia sesión para activar los avisos.'; end if;
  if coalesce(p_endpoint, '') not like 'https://%' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Suscripción no válida.';
  end if;
  if length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'Suscripción no válida.';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (me, p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
end $$;

-- Deja de enviar avisos a este dispositivo (desactivar o cerrar sesión).
create or replace function public.delete_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid()
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Configuración (solo con la clave de servicio)
-- -----------------------------------------------------------------------------
create or replace function public.configure_push(p_function_url text, p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  existing uuid;
begin
  select id into existing from vault.secrets where name = 'push_function_url';
  if existing is null then perform vault.create_secret(p_function_url, 'push_function_url');
  else perform vault.update_secret(existing, p_function_url); end if;

  select id into existing from vault.secrets where name = 'push_webhook_secret';
  if existing is null then perform vault.create_secret(p_secret, 'push_webhook_secret');
  else perform vault.update_secret(existing, p_secret); end if;
end $$;

revoke execute on function public.configure_push(text, text) from public, anon, authenticated;
grant execute on function public.configure_push(text, text) to service_role;

-- -----------------------------------------------------------------------------
-- Trigger: cada aviso nuevo se envía al móvil de su destinatario
-- -----------------------------------------------------------------------------
create or replace function public._push_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  fn_url text;
  secret text;
begin
  if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then return new; end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if fn_url is null or secret is null then return new; end if;

  -- pg_net es asíncrono: la petición sale al confirmar la transacción
  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    timeout_milliseconds := 10000
  );
  return new;
exception when others then
  -- Un fallo al avisar nunca debe impedir guardar el aviso
  raise warning 'push: %', sqlerrm;
  return new;
end $$;

revoke execute on function public._push_notification() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
  for each row execute function public._push_notification();
