-- =============================================================================
-- Reporte mensual por mail a la admin: se dispara desde /api/cron/monthly-report
-- (Vercel Cron, día 1 de cada mes) y usa el mismo pipeline de emails de siempre.
-- =============================================================================

alter table public.email_events drop constraint if exists email_events_type_check;
alter table public.email_events add constraint email_events_type_check
  check (type in (
    'booking_confirmed', 'booking_cancelled', 'user_registered',
    'birthday_month', 'kit_reservation', 'monthly_report'
  ));

drop function if exists public.enqueue_monthly_report();
create or replace function public.enqueue_monthly_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today       date := (now() at time zone 'Europe/Madrid')::date;
  v_month_start date := date_trunc('month', v_today)::date - interval '1 month';
  v_month_end   date := (date_trunc('month', v_today)::date - interval '1 day');
  v_label       text := initcap(to_char(v_month_start, 'TMMonth YYYY'));
  v_classes_count      bigint;
  v_reservations_count bigint;
  v_attended_count     bigint;
  v_pending_count      bigint;
  v_new_students       bigint;
  v_active_students    bigint;
  v_income_month       numeric;
  v_income_total       numeric;
  v_chart               jsonb;
begin
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

  insert into public.email_events (type, payload)
  values ('monthly_report', jsonb_build_object(
    'month_label',        v_label,
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
    'chart',               coalesce(v_chart, '[]'::jsonb)
  ));
end;
$$;

grant execute on function public.enqueue_monthly_report() to service_role;
