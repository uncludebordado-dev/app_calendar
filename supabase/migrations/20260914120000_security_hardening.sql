-- =============================================================================
-- Endurecimiento de seguridad (auditoría 2026-09-14):
--  1) El secreto del webhook de emails estaba hardcodeado en un .sql commiteado
--     al repo (público) -> se saca de cualquier archivo y se guarda en una
--     tabla privada que sólo puede leer la función SECURITY DEFINER.
--  2) payments.booking_id único (NULLs libres) -> evita pago duplicado si el
--     puntito se toca dos veces muy rápido.
--  3) Bucket "avatars": límites de tamaño y tipo a nivel de Storage (antes
--     sólo se validaban en el navegador).
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- 1) Secretos fuera del código: schema "private", sin acceso para anon/authenticated.
-- -----------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated;
-- Sin policies: nadie entra salvo el dueño de la función SECURITY DEFINER de abajo.

create or replace function public.dispatch_email_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'email_webhook_secret';

  -- Si todavía no cargaste el secreto (ver instrucciones), no dispares el webhook.
  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret,
      -- Anon key del proyecto: es pública a propósito (misma que usa el navegador),
      -- la protección real es el x-webhook-secret de arriba.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWx1eW5kZ2xzZnhnZ3F5eWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjE0NzQsImV4cCI6MjEwMzkzNzQ3NH0.9Xw-ctilbMhxOQm1udnCsf9qEApTSY335FTR3XtAWtg'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists email_events_dispatch on public.email_events;
create trigger email_events_dispatch
  after insert on public.email_events
  for each row execute function public.dispatch_email_event();

-- -----------------------------------------------------------------------------
-- 2) payments.booking_id único (permite muchos NULL, pero no 2 pagos para la
--    misma reserva) + admin_toggle_paid con upsert atómico (sin condición de
--    carrera entre el "exists" y el "insert/update").
-- -----------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_booking_id_key;
alter table public.payments add constraint payments_booking_id_key unique (booking_id);

create or replace function public.admin_toggle_paid(
  p_booking_id uuid,
  p_paid       boolean,
  p_method     text default 'efectivo'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_paid then
    update public.bookings
       set attended = true, no_show = false
     where id = p_booking_id;

    insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
    values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
            coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
    on conflict (booking_id) do update
      set amount = 10,
          method = coalesce(nullif(excluded.method, ''), public.payments.method);
  else
    update public.bookings
       set attended = null, no_show = false
     where id = p_booking_id;
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_paid(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Bucket "avatars": límite de tamaño (4 MB) y sólo tipos imagen, a nivel
--    de Storage (antes sólo se validaba en el navegador).
-- -----------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 4194304,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'avatars';
