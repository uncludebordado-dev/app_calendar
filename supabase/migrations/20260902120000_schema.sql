-- =============================================================================
-- un clu de bordado — esquema base
-- Tablas: profiles, availability_slots, bookings, email_events, rate_limits
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_net";         -- net.http_post() para webhooks salientes (opcional)

-- Zona horaria del emprendimiento. Todas las fechas/horas de clase se
-- interpretan como hora local de Buenos Aires.
-- (se usa en línea como literal en las funciones: 'America/Argentina/Buenos_Aires')

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles  (1‑a‑1 con auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text        not null default '',
  phone_e164   text        not null default '',
  role         text        not null default 'alumna' check (role in ('alumna', 'admin')),
  strikes      smallint    not null default 0 check (strikes >= 0),
  blocked      boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint phone_e164_format check (phone_e164 = '' or phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

comment on table public.profiles is 'Datos de la alumna/admin. El perfil está "completo" cuando full_name y phone_e164 no están vacíos.';
comment on column public.profiles.strikes is 'Sanciones acumuladas por cancelación tardía (<48h) o inasistencia.';
comment on column public.profiles.blocked is 'true = no puede reservar. Se activa automáticamente a los 3 strikes; la admin puede resetear.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- availability_slots  (franjas horarias que publica la admin)
-- -----------------------------------------------------------------------------
create table if not exists public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  class_date    date        not null,
  start_time    time        not null,
  end_time      time        not null,
  capacity      smallint    not null default 6 check (capacity between 1 and 6),
  booked_count  smallint    not null default 0 check (booked_count >= 0),
  notes         text,
  is_published  boolean     not null default true,
  created_by    uuid        references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint slot_time_order   check (end_time > start_time),
  constraint slot_not_overbooked check (booked_count <= capacity),
  constraint slot_unique_start unique (class_date, start_time)
);

comment on table public.availability_slots is 'Franjas de clase disponibles. Cupo máximo 6. booked_count se mantiene por las funciones book_slot()/cancel_booking().';

create index if not exists availability_slots_date_idx
  on public.availability_slots (class_date, start_time);

create index if not exists availability_slots_bookable_idx
  on public.availability_slots (class_date)
  where is_published and booked_count < capacity;

create trigger availability_slots_set_updated_at
  before update on public.availability_slots
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- bookings  (reservas)
-- -----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  slot_id           uuid        not null references public.availability_slots (id) on delete cascade,
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  status            text        not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  late_cancellation boolean     not null default false,
  no_show           boolean     not null default false,
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz,
  cancelled_by      uuid        references public.profiles (id) on delete set null
);

comment on table public.bookings is 'Reservas. Se crean/cancelan sólo vía las funciones book_slot() y cancel_booking() (INSERT/UPDATE directo bloqueado por RLS).';

-- Una sola reserva activa por (franja, alumna). Permite volver a reservar
-- luego de cancelar (status = 'cancelled' no cuenta).
create unique index if not exists bookings_one_active_per_slot
  on public.bookings (slot_id, user_id)
  where status = 'confirmed';

create index if not exists bookings_user_idx  on public.bookings (user_id, created_at desc);
create index if not exists bookings_slot_idx  on public.bookings (slot_id) where status = 'confirmed';

-- -----------------------------------------------------------------------------
-- email_events  (cola de notificaciones -> Edge Function `send-booking-emails`)
-- -----------------------------------------------------------------------------
create table if not exists public.email_events (
  id            uuid primary key default gen_random_uuid(),
  type          text        not null check (type in ('booking_confirmed', 'booking_cancelled')),
  booking_id    uuid        references public.bookings (id) on delete set null,
  payload       jsonb       not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

comment on table public.email_events is 'Cada fila dispara 2 emails (alumna + admin) vía Database Webhook -> Edge Function. payload está desnormalizado para no exponer joins.';

create index if not exists email_events_unprocessed_idx
  on public.email_events (created_at)
  where processed_at is null;

-- -----------------------------------------------------------------------------
-- rate_limits  (anti‑spam para registro y reservas)
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  id         bigint generated always as identity primary key,
  bucket     text        not null,
  subject    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (bucket, subject, created_at);
