-- =============================================================================
-- FIX: auth.users.email es varchar(255); las funciones lo devolvían en columnas
-- declaradas como `text`, lo que provoca en tiempo de ejecución:
--   42804: structure of query does not match function result type
--   "Returned type character varying(255) does not match expected type text"
-- Efecto visible: el panel de admin no listaba alumnas ni inscriptas.
-- Solución: castear u.email::text en cada función afectada.
-- =============================================================================

-- ---- admin_rosters_between() -------------------------------------------------
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
    p.full_name, p.phone_e164, u.email::text, b.created_at
  from public.availability_slots s
  left join public.bookings b
    on b.slot_id = s.id and b.status = 'confirmed'
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id
  where s.class_date between p_from and p_to
  order by s.class_date, s.start_time, p.full_name nulls last;
end;
$$;

-- ---- admin_list_students() -------------------------------------------------
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
    p.id, p.full_name, p.phone_e164, u.email::text, p.strikes, p.blocked,
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

-- ---- admin_month_summary() -----------------------------------------------
create or replace function public.admin_month_summary(p_from date, p_to date)
returns table (
  user_id         uuid,
  full_name       text,
  phone_e164      text,
  email           text,
  birth_date      date,
  strikes         smallint,
  blocked         boolean,
  reserved_count  bigint,
  attended_count  bigint,
  noshow_count    bigint,
  cancelled_count bigint,
  paid_total      numeric,
  payments_count  bigint,
  last_payment_on date
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
  with month_bookings as (
    select b.*, s.class_date, s.start_time
      from public.bookings b
      join public.availability_slots s on s.id = b.slot_id
     where s.class_date between p_from and p_to
  ),
  month_payments as (
    select * from public.payments where paid_on between p_from and p_to
  )
  select
    p.id, p.full_name, p.phone_e164, u.email::text, p.birth_date, p.strikes, p.blocked,
    count(mb.*) filter (where mb.status = 'confirmed'),
    count(mb.*) filter (
      where mb.status = 'confirmed'
        and mb.no_show = false
        and (mb.class_date + mb.start_time) < (now() at time zone 'Europe/Madrid')
    ),
    count(mb.*) filter (where mb.no_show),
    count(mb.*) filter (where mb.status = 'cancelled'),
    coalesce(sum(mp.amount), 0),
    count(mp.*),
    max(mp.paid_on)
  from public.profiles p
  join auth.users u on u.id = p.id
  left join month_bookings mb on mb.user_id = p.id
  left join month_payments mp on mp.user_id = p.id
  where p.role = 'alumna'
  group by p.id, u.email
  order by p.full_name;
end;
$$;

-- ---- admin_students_overview() -----------------------------------------
create or replace function public.admin_students_overview(p_from date, p_to date)
returns table (
  user_id      uuid,
  full_name    text,
  email        text,
  phone_e164   text,
  birth_date   date,
  registered_on date,
  strikes      smallint,
  blocked      boolean,
  bookings     jsonb
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
    p.created_at::date, p.strikes, p.blocked,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
          'booking_id', b.id,
          'class_date', to_char(s.class_date, 'YYYY-MM-DD'),
          'start_time', to_char(s.start_time, 'HH24:MI'),
          'status',     b.status,
          'attended',   b.attended,
          'no_show',    b.no_show,
          'paid',       (pay.id is not null),
          'amount',     pay.amount
        ) order by s.class_date, s.start_time)
       from public.bookings b
       join public.availability_slots s on s.id = b.slot_id
       left join public.payments pay on pay.booking_id = b.id
       where b.user_id = p.id
         and b.status = 'confirmed'
         and s.class_date between p_from and p_to),
      '[]'::jsonb
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'alumna'
  order by p.full_name;
end;
$$;
