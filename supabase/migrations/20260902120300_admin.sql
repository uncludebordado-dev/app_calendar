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
