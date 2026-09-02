-- =============================================================================
-- un clu de bordado — TODO el esquema en un solo archivo.
-- Pegá este contenido completo en el SQL Editor de Supabase y ejecutalo UNA vez.
-- Orden: schema -> functions -> rls -> admin
-- =============================================================================


-- >>> supabase/migrations/20260902120000_schema.sql

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


-- >>> supabase/migrations/20260902120100_functions.sql

-- =============================================================================
-- Funciones y triggers de dominio
-- =============================================================================

-- -----------------------------------------------------------------------------
-- is_admin(): ¿el usuario actual es admin?  SECURITY DEFINER evita recursión RLS.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- handle_new_user(): crea el profile al registrarse.
--  - email/password: full_name y phone_e164 llegan por options.data (user metadata)
--  - Google OAuth: toma el nombre de Google; el teléfono queda vacío -> gate
--  - La dueña (email fijo) queda como admin automáticamente.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name  text;
  v_phone text;
  v_role  text := 'alumna';
begin
  v_name  := trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', ''));
  v_phone := trim(coalesce(v_meta ->> 'phone_e164', ''));

  if lower(new.email) = 'uncludebordado@gmail.com' then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, phone_e164, role)
  values (new.id, v_name, case when v_phone ~ '^\+[1-9][0-9]{6,14}$' then v_phone else '' end, v_role)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- profiles_guard(): una alumna sólo puede tocar su nombre/teléfono.
-- role / strikes / blocked son inmutables salvo para admin.
-- -----------------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.id <> auth.uid() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  new.role    := old.role;
  new.strikes := old.strikes;
  new.blocked := old.blocked;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- -----------------------------------------------------------------------------
-- check_rate_limit(): true = permitido. Borra la ventana vieja, cuenta, inserta.
-- -----------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_bucket         text,
  p_subject        text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limits
   where bucket = p_bucket
     and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
    from public.rate_limits
   where bucket = p_bucket
     and subject = p_subject;

  if v_count >= p_max then
    return false;
  end if;

  insert into public.rate_limits (bucket, subject) values (p_bucket, p_subject);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, text, integer, integer) from anon, authenticated;

-- -----------------------------------------------------------------------------
-- book_slot(): reserva atómica. Devuelve la fila de bookings creada.
-- Errores (errcode 'P0001') con mensajes estables para el frontend:
--   profile_incomplete | user_blocked | already_booked | slot_not_found
--   slot_full | slot_past
-- -----------------------------------------------------------------------------
create or replace function public.book_slot(p_slot_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_slot    public.availability_slots;
  v_rows    integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.full_name = '' or v_profile.phone_e164 = '' then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;
  if v_profile.blocked then
    raise exception 'user_blocked' using errcode = 'P0001';
  end if;

  -- ¿ya tiene reserva activa en esta franja?
  if exists (
    select 1 from public.bookings
    where slot_id = p_slot_id and user_id = v_uid and status = 'confirmed'
  ) then
    raise exception 'already_booked' using errcode = 'P0001';
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id;
  if not found or not v_slot.is_published then
    raise exception 'slot_not_found' using errcode = 'P0001';
  end if;
  if (v_slot.class_date + v_slot.start_time)
       <= (now() at time zone 'America/Argentina/Buenos_Aires') then
    raise exception 'slot_past' using errcode = 'P0001';
  end if;

  -- UPDATE condicional: sólo incrementa si queda cupo. Gana la carrera.
  update public.availability_slots
     set booked_count = booked_count + 1
   where id = p_slot_id
     and is_published
     and booked_count < capacity;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  insert into public.bookings (slot_id, user_id)
  values (p_slot_id, v_uid)
  returning * into v_booking;

  return v_booking;
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_booking(): cancela y libera cupo. Si es <48h -> strike (y bloqueo a 3).
-- Errores: not_authenticated | booking_not_found | not_owner | already_cancelled
-- -----------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_booking   public.bookings;
  v_slot      public.availability_slots;
  v_hours     numeric;
  v_late      boolean;
  v_strikes   smallint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;

  select * into v_slot from public.availability_slots where id = v_booking.slot_id;

  v_hours := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'America/Argentina/Buenos_Aires')
  )) / 3600.0;
  v_late := v_hours < 48;

  update public.bookings
     set status            = 'cancelled',
         cancelled_at       = now(),
         cancelled_by       = v_uid,
         late_cancellation  = v_late
   where id = p_booking_id
  returning * into v_booking;

  update public.availability_slots
     set booked_count = greatest(booked_count - 1, 0)
   where id = v_booking.slot_id;

  -- Strike sólo si la cancela la propia alumna con menos de 48h.
  if v_late and v_booking.user_id = v_uid then
    update public.profiles
       set strikes = strikes + 1,
           blocked = (strikes + 1) >= 3
     where id = v_booking.user_id
    returning strikes into v_strikes;
  end if;

  return v_booking;
end;
$$;

-- -----------------------------------------------------------------------------
-- mark_no_show(): admin. Marca inasistencia y suma strike (no libera cupo).
-- -----------------------------------------------------------------------------
create or replace function public.mark_no_show(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  update public.bookings set no_show = true where id = p_booking_id;

  update public.profiles
     set strikes = strikes + 1,
         blocked = (strikes + 1) >= 3
   where id = v_booking.user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- reset_strikes(): admin. Perdona sanciones y desbloquea.
-- -----------------------------------------------------------------------------
create or replace function public.reset_strikes(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  update public.profiles
     set strikes = 0, blocked = false
   where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Encola notificaciones de email al confirmar / cancelar una reserva.
-- -----------------------------------------------------------------------------
create or replace function public.enqueue_booking_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type     text;
  v_user     record;
  v_slot     public.availability_slots;
begin
  if tg_op = 'INSERT' then
    v_type := 'booking_confirmed';
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'confirmed' then
    v_type := 'booking_cancelled';
  else
    return coalesce(new, old);
  end if;

  select p.full_name, p.phone_e164, u.email
    into v_user
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = new.user_id;

  select * into v_slot from public.availability_slots where id = new.slot_id;

  insert into public.email_events (type, booking_id, payload)
  values (
    v_type,
    new.id,
    jsonb_build_object(
      'booking_id',    new.id,
      'student_name',   v_user.full_name,
      'student_email',  v_user.email,
      'student_phone',  v_user.phone_e164,
      'class_date',     to_char(v_slot.class_date, 'YYYY-MM-DD'),
      'start_time',     to_char(v_slot.start_time, 'HH24:MI'),
      'end_time',       to_char(v_slot.end_time, 'HH24:MI'),
      'notes',          coalesce(v_slot.notes, ''),
      'late_cancellation', new.late_cancellation
    )
  );

  return new;
end;
$$;

drop trigger if exists bookings_email_insert on public.bookings;
create trigger bookings_email_insert
  after insert on public.bookings
  for each row execute function public.enqueue_booking_email();

drop trigger if exists bookings_email_cancel on public.bookings;
create trigger bookings_email_cancel
  after update of status on public.bookings
  for each row execute function public.enqueue_booking_email();


-- >>> supabase/migrations/20260902120200_rls.sql

-- =============================================================================
-- Row Level Security — habilitado en TODAS las tablas.
-- Regla general: cada alumna sólo ve/edita lo suyo; sólo la admin ve el resto.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings           enable row level security;
alter table public.email_events       enable row level security;
alter table public.rate_limits        enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- El trigger profiles_guard() impide que una alumna cambie role/strikes/blocked.
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- (sin policy de DELETE: los profiles se borran por cascade de auth.users)

-- -----------------------------------------------------------------------------
-- availability_slots
--   lectura: cualquier usuaria autenticada ve las publicadas; la admin ve todo
--   escritura: sólo admin
-- -----------------------------------------------------------------------------
drop policy if exists slots_select_published_or_admin on public.availability_slots;
create policy slots_select_published_or_admin on public.availability_slots
  for select using (
    (auth.uid() is not null and is_published) or public.is_admin()
  );

drop policy if exists slots_admin_insert on public.availability_slots;
create policy slots_admin_insert on public.availability_slots
  for insert with check (public.is_admin());

drop policy if exists slots_admin_update on public.availability_slots;
create policy slots_admin_update on public.availability_slots
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists slots_admin_delete on public.availability_slots;
create policy slots_admin_delete on public.availability_slots
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- bookings
--   lectura: la alumna ve las suyas; la admin ve todas
--   INSERT/UPDATE/DELETE directos: DENEGADOS. Sólo vía book_slot()/cancel_booking()
--   (SECURITY DEFINER -> corren como owner y saltan RLS).
-- -----------------------------------------------------------------------------
drop policy if exists bookings_select_own_or_admin on public.bookings;
create policy bookings_select_own_or_admin on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());

-- Sin policies de insert/update/delete => nadie puede hacerlo con la anon/auth key.

-- -----------------------------------------------------------------------------
-- email_events — sólo admin puede mirar la cola. Nada de escritura desde el cliente.
-- -----------------------------------------------------------------------------
drop policy if exists email_events_admin_select on public.email_events;
create policy email_events_admin_select on public.email_events
  for select using (public.is_admin());

-- -----------------------------------------------------------------------------
-- rate_limits — sin policies: inaccesible con anon/auth key.
-- Sólo check_rate_limit() (SECURITY DEFINER) la toca.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Grants de ejecución de funciones
-- -----------------------------------------------------------------------------
grant execute on function public.book_slot(uuid)        to authenticated;
grant execute on function public.cancel_booking(uuid)   to authenticated;
grant execute on function public.mark_no_show(uuid)     to authenticated; -- validación interna: is_admin()
grant execute on function public.reset_strikes(uuid)    to authenticated; -- idem
grant execute on function public.is_admin()             to authenticated;

-- check_rate_limit se invoca sólo con service role (ver src/lib/rate-limit.ts)


-- >>> supabase/migrations/20260902120300_admin.sql

-- =============================================================================
-- Lecturas de administración. SECURITY DEFINER + chequeo is_admin() para poder
-- unir bookings + profiles + auth.users (email) sin exponer auth.users por RLS.
-- =============================================================================

-- Inscriptas a las clases entre dos fechas (incluye datos de contacto).
create or replace function public.admin_rosters_between(p_from date, p_to date)
returns table (
  slot_id        uuid,
  class_date     date,
  start_time     time,
  end_time       time,
  capacity       smallint,
  booked_count   smallint,
  notes          text,
  is_published   boolean,
  booking_id     uuid,
  booking_status text,
  no_show        boolean,
  late_cancellation boolean,
  student_name   text,
  student_phone  text,
  student_email  text,
  booked_at      timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  return query
  select
    s.id, s.class_date, s.start_time, s.end_time, s.capacity, s.booked_count,
    s.notes, s.is_published,
    b.id, b.status, b.no_show, b.late_cancellation,
    p.full_name, p.phone_e164, u.email, b.created_at
  from public.availability_slots s
  left join public.bookings b
    on b.slot_id = s.id and b.status = 'confirmed'
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  where s.class_date between p_from and p_to
  order by s.class_date, s.start_time, p.full_name nulls last;
end;
$$;

revoke all on function public.admin_rosters_between(date, date) from anon;
grant execute on function public.admin_rosters_between(date, date) to authenticated;

-- Listado de alumnas con sanciones y actividad.
create or replace function public.admin_list_students()
returns table (
  id             uuid,
  full_name      text,
  phone_e164     text,
  email          text,
  strikes        smallint,
  blocked        boolean,
  confirmed_count bigint,
  cancelled_count bigint,
  created_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  return query
  select
    p.id, p.full_name, p.phone_e164, u.email, p.strikes, p.blocked,
    count(b.*) filter (where b.status = 'confirmed'),
    count(b.*) filter (where b.status = 'cancelled'),
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.bookings b on b.user_id = p.id
  where p.role = 'alumna'
  group by p.id, u.email
  order by p.blocked desc, p.strikes desc, p.full_name;
end;
$$;

revoke all on function public.admin_list_students() from anon;
grant execute on function public.admin_list_students() to authenticated;

