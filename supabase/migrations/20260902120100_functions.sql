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
