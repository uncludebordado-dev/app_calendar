-- =============================================================================
-- 1) La baja <24h marca "penalty_fee" (bolita amarilla) también para alumnas
--    exentas -- lo que cambia es que nunca se les genera el cobro real.
-- 2) admin_toggle_penalty_paid(): si la alumna es exenta, no genera pago.
-- 3) enqueue_monthly_report(): ahora cubre el MES EN CURSO (se dispara el
--    último día del mes, a la noche, así entra la clase de ese mismo día);
--    suma el listado de alumnas con sus "bolitas" del mes; evita duplicados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cancel_booking(): la bolita amarilla se marca igual para exentas.
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
  v_penalty   boolean;
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

  v_hours   := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
  )) / 3600.0;
  v_late    := v_hours < 48;
  -- La marca (bolita amarilla) es igual para todas; lo que varía por exención
  -- es si eso genera o no un cobro real (ver admin_toggle_penalty_paid).
  v_penalty := v_hours < 24 and v_booking.user_id = v_uid;

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
-- admin_toggle_penalty_paid(): rechaza el cobro si la alumna es exenta.
-- -----------------------------------------------------------------------------
create or replace function public.admin_toggle_penalty_paid(
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
  v_b      public.bookings;
  v_exempt boolean;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id and penalty_fee is true;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_paid then
    select coalesce(payment_exempt, false) into v_exempt
      from public.profiles where id = v_b.user_id;
    if v_exempt then
      raise exception 'alumna_exenta' using errcode = 'P0001';
    end if;

    insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
    values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
            coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
    on conflict (booking_id) do update
      set amount = 10,
          method = coalesce(nullif(excluded.method, ''), public.payments.method);
  else
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_penalty_paid(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- enqueue_monthly_report() v2: mes en curso + listado de alumnas con bolitas.
-- -----------------------------------------------------------------------------
drop function if exists public.enqueue_monthly_report();
create or replace function public.enqueue_monthly_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today       date := (now() at time zone 'Europe/Madrid')::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_month_end   date := v_today;  -- se dispara el último día del mes
  v_ym          text := to_char(v_today, 'YYYY-MM');
  v_label       text := initcap(to_char(v_month_start, 'TMMonth YYYY'));
  v_classes_count      bigint;
  v_reservations_count bigint;
  v_attended_count     bigint;
  v_pending_count      bigint;
  v_new_students       bigint;
  v_active_students    bigint;
  v_income_month       numeric;
  v_income_total       numeric;
  v_chart              jsonb;
  v_students           jsonb;
begin
  -- Evita mandarlo dos veces si el cron se dispara más de una vez el mismo día.
  if exists (
    select 1 from public.email_events
    where type = 'monthly_report' and payload ->> 'ym' = v_ym
  ) then
    return;
  end if;

  select count(*) into v_classes_count
    from public.availability_slots
   where class_date between v_month_start and v_month_end;

  select count(*) into v_reservations_count
    from public.bookings b join public.availability_slots s on s.id = b.slot_id
   where s.class_date between v_month_start and v_month_end and b.status = 'confirmed';

  select count(*) into v_attended_count
    from public.bookings b join public.availability_slots s on s.id = b.slot_id
   where s.class_date between v_month_start and v_month_end
     and b.status = 'confirmed' and b.attended is true;

  select count(*) into v_pending_count
    from public.bookings b join public.availability_slots s on s.id = b.slot_id
   where s.class_date between v_month_start and v_month_end
     and b.status = 'confirmed' and coalesce(b.attended, false) = false;

  select count(*) into v_new_students
    from public.profiles
   where role = 'alumna' and created_at::date between v_month_start and v_month_end;

  select count(*) into v_active_students from public.profiles where role = 'alumna';

  select coalesce(sum(amount), 0) into v_income_month
    from public.payments where paid_on between v_month_start and v_month_end;

  select coalesce(sum(amount), 0) into v_income_total from public.payments;

  select jsonb_agg(jsonb_build_object(
           'ym', ym,
           'label', initcap(to_char(to_date(ym || '-01', 'YYYY-MM-DD'), 'TMMon')),
           'income', income
         ) order by ym)
    into v_chart
  from (
    select to_char(d, 'YYYY-MM') as ym,
           (select coalesce(sum(amount), 0) from public.payments
              where paid_on >= d::date and paid_on < (d + interval '1 month')::date) as income
    from generate_series(
           date_trunc('month', v_month_end) - interval '5 months',
           date_trunc('month', v_month_end),
           interval '1 month'
         ) d
  ) s;

  -- Listado de alumnas del mes con sus "bolitas" (reservas + bajas con cargo).
  select jsonb_agg(jsonb_build_object(
           'full_name', p.full_name,
           'payment_exempt', p.payment_exempt,
           'bookings', coalesce(sb.bookings, '[]'::jsonb)
         ) order by p.full_name)
    into v_students
  from public.profiles p
  left join (
    select b.user_id,
           jsonb_agg(jsonb_build_object(
             'class_date',  to_char(s.class_date, 'YYYY-MM-DD'),
             'start_time',  to_char(s.start_time, 'HH24:MI'),
             'status',      b.status,
             'attended',    b.attended,
             'penalty_fee', b.penalty_fee,
             'paid',        (pay.id is not null) or (pr.payment_exempt and b.attended is true)
           ) order by s.class_date, s.start_time) as bookings
      from public.bookings b
      join public.availability_slots s on s.id = b.slot_id
      join public.profiles pr on pr.id = b.user_id
      left join public.payments pay on pay.booking_id = b.id
     where s.class_date between v_month_start and v_month_end
       and (b.status = 'confirmed' or b.penalty_fee is true)
     group by b.user_id
  ) sb on sb.user_id = p.id
  where p.role = 'alumna'
    and (sb.user_id is not null); -- sólo alumnas con actividad ese mes

  insert into public.email_events (type, payload)
  values ('monthly_report', jsonb_build_object(
    'ym',                  v_ym,
    'month_label',         v_label,
    'from',                to_char(v_month_start, 'YYYY-MM-DD'),
    'to',                  to_char(v_month_end, 'YYYY-MM-DD'),
    'classes_count',       v_classes_count,
    'reservations_count',  v_reservations_count,
    'attended_count',      v_attended_count,
    'pending_count',       v_pending_count,
    'new_students',        v_new_students,
    'active_students',     v_active_students,
    'income_month',        v_income_month,
    'income_total',        v_income_total,
    'chart',               coalesce(v_chart, '[]'::jsonb),
    'students',            coalesce(v_students, '[]'::jsonb)
  ));
end;
$$;

grant execute on function public.enqueue_monthly_report() to service_role;
-- (email_events ya tiene policy de select para admin desde el schema original.)
