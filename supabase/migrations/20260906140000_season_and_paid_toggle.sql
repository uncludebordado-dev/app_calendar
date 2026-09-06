-- =============================================================================
-- 1) El gráfico de barras arranca en septiembre 2026 (no "últimos 12 meses").
-- 2) admin_toggle_paid(): el "puntito" pasa a ser un toggle rojo/verde.
--    Verde = pagó -> asistencia + pago fijo de 10 €. Rojo = sin cobrar.
-- =============================================================================

-- ---- admin_students_by_month(): meses desde 2026-09 hasta el mes actual ------
drop function if exists public.admin_students_by_month(integer);
create or replace function public.admin_students_by_month(p_months integer default 24)
returns table (ym text, new_count bigint, cumulative bigint)
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
  with bounds as (
    select date '2026-09-01' as start_m,
           greatest(
             date '2026-09-01',
             date_trunc('month', (now() at time zone 'Europe/Madrid'))::date
           ) as end_m
  ),
  months as (
    select to_char(d, 'YYYY-MM') as ym, d::date as m0
    from bounds,
         generate_series((select start_m from bounds),
                         (select end_m from bounds),
                         interval '1 month') d
  ),
  per_month as (
    select to_char(date_trunc('month', p.created_at at time zone 'Europe/Madrid'), 'YYYY-MM') as ym,
           count(*) as c
    from public.profiles p
    where p.role = 'alumna'
    group by 1
  )
  select
    months.ym,
    coalesce(per_month.c, 0),
    (select count(*) from public.profiles p2
      where p2.role = 'alumna'
        and (p2.created_at at time zone 'Europe/Madrid') < months.m0 + interval '1 month')
  from months
  left join per_month on per_month.ym = months.ym
  order by months.ym;
end;
$$;
grant execute on function public.admin_students_by_month(integer) to authenticated;

-- ---- admin_month_totals(): "inasistencias" -> "sin cobrar" (clases pasadas) --
create or replace function public.admin_month_totals(p_from date, p_to date)
returns table (
  classes_count      bigint,
  reservations_count bigint,
  attended_count     bigint,
  noshow_count       bigint,
  income_total       numeric,
  active_students    bigint,
  new_students       bigint
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
    (select count(*) from public.availability_slots
       where class_date between p_from and p_to),
    (select count(*) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'),
    -- clases cobradas (el puntito verde marca asistencia + pago)
    (select count(*) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'
         and b.attended is true),
    -- sin cobrar: confirmadas, clase ya pasada, todavía no marcada
    (select count(*) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'
         and coalesce(b.attended, false) = false
         and (s.class_date + s.start_time) < (now() at time zone 'Europe/Madrid')),
    (select coalesce(sum(amount), 0) from public.payments
       where paid_on between p_from and p_to),
    (select count(distinct b.user_id) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'),
    (select count(*) from public.profiles
       where role = 'alumna' and created_at::date between p_from and p_to);
end;
$$;
grant execute on function public.admin_month_totals(date, date) to authenticated;

-- ---- admin_toggle_paid(): toggle de cobro del puntito ----------------------
drop function if exists public.admin_toggle_paid(uuid, boolean, text);
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

    if exists (select 1 from public.payments where booking_id = p_booking_id) then
      update public.payments
         set amount = 10,
             method = coalesce(nullif(p_method, ''), 'efectivo')
       where booking_id = p_booking_id;
    else
      insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
      values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
              coalesce(nullif(p_method, ''), 'efectivo'), auth.uid());
    end if;
  else
    update public.bookings
       set attended = null, no_show = false
     where id = p_booking_id;
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_paid(uuid, boolean, text) to authenticated;
