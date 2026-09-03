-- =============================================================================
-- Cambio de zona horaria del taller a Europe/Madrid.
-- Re-crea book_slot() y cancel_booking() (dashboard.sql ya viene con Madrid).
-- =============================================================================

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
       <= (now() at time zone 'Europe/Madrid') then
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
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
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

