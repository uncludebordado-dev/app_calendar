-- =============================================================================
-- admin_students_overview() ahora devuelve payment_exempt por alumna, para que
-- el panel pueda mostrar "Asistió / No asistió" (sin mención de € ni medio de
-- pago) en vez de "Pagó / No pagó" cuando la alumna es exenta.
-- =============================================================================

drop function if exists public.admin_students_overview(date, date);
create or replace function public.admin_students_overview(p_from date, p_to date)
returns table (
  user_id        uuid,
  full_name      text,
  email          text,
  phone_e164     text,
  birth_date     date,
  registered_on  date,
  strikes        smallint,
  blocked        boolean,
  payment_exempt boolean,
  bookings       jsonb
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
    p.id, p.full_name, u.email::text, p.phone_e164, p.birth_date,
    p.created_at::date, p.strikes, p.blocked, p.payment_exempt,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'booking_id', b.id,
          'class_date', to_char(s.class_date, 'YYYY-MM-DD'),
          'start_time', to_char(s.start_time, 'HH24:MI'),
          'status',     b.status,
          'attended',   b.attended,
          'no_show',    b.no_show,
          'penalty_fee', b.penalty_fee,
          'paid',       (pay.id is not null) or (p.payment_exempt and b.attended is true),
          'amount',     pay.amount
        ) order by s.class_date, s.start_time)
       from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       left join public.payments pay on pay.booking_id = b.id
       where b.user_id = p.id
         and (b.status = 'confirmed' or b.penalty_fee is true)
         and s.class_date between p_from and p_to),
      '[]'::jsonb
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'alumna'
  order by p.full_name;
end;
$$;
