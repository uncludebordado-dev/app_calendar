-- =============================================================================
-- Se elimina la franja intermedia de "sanción" para bajas entre 24 y 48 hs.
-- Regla nueva, única: +48h antes = gratis. -48h antes = se cobra la clase
-- (10 €) igual, sin sumar sanción. Las sanciones (strikes) ahora solo las
-- pone la admin manualmente por inasistencia.
-- =============================================================================

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
  v_penalty   boolean;
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

  v_hours   := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
  )) / 3600.0;
  v_late    := v_hours < 48;
  -- La marca (bolita amarilla / cobro) es igual para todas; lo que varía por
  -- exención es si eso genera o no un cobro real (ver admin_toggle_penalty_paid).
  -- Ya no se cobra distinto según 24h vs 48h: cualquier baja de -48h cobra.
  v_penalty := v_hours < 48 and v_booking.user_id = v_uid;

  update public.bookings
     set status            = 'cancelled',
         cancelled_at      = now(),
         cancelled_by      = v_uid,
         late_cancellation = v_late,
         penalty_fee       = v_penalty
   where id = p_booking_id
  returning * into v_booking;

  update public.availability_slots
     set booked_count = greatest(booked_count - 1, 0)
   where id = v_booking.slot_id;

  return v_booking;
end;
$$;
