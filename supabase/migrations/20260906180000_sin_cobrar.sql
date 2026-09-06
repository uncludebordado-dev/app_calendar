-- =============================================================================
-- Dashboard: "Sin cobrar" = clases confirmadas del mes seleccionado que
-- todavía NO están marcadas como pagadas (puntito rojo), pasadas o futuras.
-- Ej.: Daiana con 3 clases en septiembre y 1 pagada  ->  Sin cobrar = 2.
-- =============================================================================
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
    -- clases cobradas (puntito verde = asistió + pagó)
    (select count(*) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'
         and b.attended is true),
    -- SIN COBRAR: confirmadas del mes todavía sin marcar como pagadas
    (select count(*) from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'
         and b.attended is not true),
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
