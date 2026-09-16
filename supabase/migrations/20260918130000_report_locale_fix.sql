-- =============================================================================
-- Fix: el reporte mensual salía con el mes en inglés ("September 2026" en vez
-- de "Septiembre 2026") porque to_char(...,'TMMonth') depende del locale del
-- servidor de Postgres, que no está en español. Se reemplaza por un mapeo
-- fijo a nombres en castellano, sin depender del locale.
-- =============================================================================
drop function if exists public.enqueue_monthly_report();
create or replace function public.enqueue_monthly_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meses text[] := array['enero','febrero','marzo','abril','mayo','junio',
                           'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  v_meses_abr text[] := array['Ene','Feb','Mar','Abr','May','Jun',
                               'Jul','Ago','Sep','Oct','Nov','Dic'];
  v_today       date := (now() at time zone 'Europe/Madrid')::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_month_end   date := v_today;
  v_ym          text := to_char(v_today, 'YYYY-MM');
  v_label       text := v_meses[extract(month from v_month_start)::int] || ' ' || extract(year from v_month_start)::text;
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
           'label', v_meses_abr[extract(month from to_date(ym || '-01', 'YYYY-MM-DD'))::int],
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
    and (sb.user_id is not null);

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
