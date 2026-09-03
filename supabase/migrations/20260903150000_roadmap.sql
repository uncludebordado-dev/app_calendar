-- =============================================================================
-- Roadmap: asistencia + pago por "puntito", dashboard, cumpleaños, kits.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- bookings.attended  (lo marca la profe tras la clase)  +  payment <-> booking
-- -----------------------------------------------------------------------------
alter table public.bookings  add column if not exists attended boolean;
alter table public.payments  add column if not exists booking_id uuid
  references public.bookings (id) on delete set null;

create index if not exists payments_booking_idx on public.payments (booking_id);

-- -----------------------------------------------------------------------------
-- email_events: nuevos tipos
-- -----------------------------------------------------------------------------
alter table public.email_events drop constraint if exists email_events_type_check;
alter table public.email_events add constraint email_events_type_check
  check (type in (
    'booking_confirmed', 'booking_cancelled', 'user_registered',
    'birthday_month', 'kit_reservation'
  ));

-- -----------------------------------------------------------------------------
-- kit_orders  (Reserva tu Kit — sin pasarela de pago)
-- -----------------------------------------------------------------------------
create table if not exists public.kit_orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  kit        text        not null check (kit in ('basico', 'medium', 'pro')),
  quantity   smallint    not null default 1 check (quantity between 1 and 20),
  note       text,
  status     text        not null default 'pendiente'
               check (status in ('pendiente', 'contactada', 'entregada', 'cancelada')),
  created_at timestamptz not null default now()
);

create index if not exists kit_orders_user_idx on public.kit_orders (user_id, created_at desc);

alter table public.kit_orders enable row level security;

drop policy if exists kit_orders_select_own_or_admin on public.kit_orders;
create policy kit_orders_select_own_or_admin on public.kit_orders
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists kit_orders_insert_own on public.kit_orders;
create policy kit_orders_insert_own on public.kit_orders
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.full_name <> '' and p.phone_e164 <> '')
  );

drop policy if exists kit_orders_admin_update on public.kit_orders;
create policy kit_orders_admin_update on public.kit_orders
  for update using (public.is_admin()) with check (public.is_admin());

-- Aviso por email a la profe al reservarse un kit.
create or replace function public.enqueue_kit_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name  text;
  v_phone text;
  v_email text;
begin
  select p.full_name, p.phone_e164, u.email
    into v_name, v_phone, v_email
    from public.profiles p join auth.users u on u.id = p.id
   where p.id = new.user_id;

  insert into public.email_events (type, payload)
  values ('kit_reservation', jsonb_build_object(
    'student_name', v_name, 'student_phone', v_phone, 'student_email', v_email,
    'kit', new.kit, 'quantity', new.quantity, 'note', coalesce(new.note, '')
  ));
  return new;
end;
$$;

drop trigger if exists kit_orders_email on public.kit_orders;
create trigger kit_orders_email
  after insert on public.kit_orders
  for each row execute function public.enqueue_kit_email();

-- -----------------------------------------------------------------------------
-- admin_set_booking_status()  — marca asistencia y/o pago desde el "puntito"
-- -----------------------------------------------------------------------------
drop function if exists public.admin_set_booking_status(uuid, boolean, boolean, numeric, text);
create or replace function public.admin_set_booking_status(
  p_booking_id uuid,
  p_attended   boolean,
  p_paid       boolean,
  p_amount     numeric,
  p_method     text
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

  update public.bookings
     set attended = p_attended,
         no_show  = case when p_attended is false then true else no_show end
   where id = p_booking_id;

  if p_paid then
    if exists (select 1 from public.payments where booking_id = p_booking_id) then
      update public.payments
         set amount = p_amount,
             method = coalesce(nullif(p_method, ''), method)
       where booking_id = p_booking_id;
    else
      insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
      values (v_b.user_id, v_b.slot_id, p_booking_id, p_amount,
              coalesce(nullif(p_method, ''), 'efectivo'), auth.uid());
    end if;
  else
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;

grant execute on function public.admin_set_booking_status(uuid, boolean, boolean, numeric, text) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_students_overview()  — alumnas + sus reservas del período (para "puntitos")
-- -----------------------------------------------------------------------------
drop function if exists public.admin_students_overview(date, date);
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
    p.id, p.full_name, u.email, p.phone_e164, p.birth_date,
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

grant execute on function public.admin_students_overview(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_month_totals()  — se agrega "alumnas nuevas del mes"; asistencia por flag
-- -----------------------------------------------------------------------------
drop function if exists public.admin_month_totals(date, date);
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
    (select count(*) from public.availability_slots where class_date between p_from and p_to),
    (select count(*) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'),
    (select count(*) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed' and b.attended is true),
    (select count(*) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'
         and (b.no_show is true or b.attended is false)),
    (select coalesce(sum(amount), 0) from public.payments where paid_on between p_from and p_to),
    (select count(distinct b.user_id) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed'),
    (select count(*) from public.profiles where role = 'alumna'
       and created_at::date between p_from and p_to);
end;
$$;

grant execute on function public.admin_month_totals(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_students_by_month()  — para el gráfico de barras (total de alumnas por mes)
-- -----------------------------------------------------------------------------
drop function if exists public.admin_students_by_month(integer);
create or replace function public.admin_students_by_month(p_months integer default 12)
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
  with months as (
    select to_char(d, 'YYYY-MM') as ym, date_trunc('month', d)::date as m0
    from generate_series(
      date_trunc('month', (now() at time zone 'Europe/Madrid')) - make_interval(months => greatest(1, p_months) - 1),
      date_trunc('month', (now() at time zone 'Europe/Madrid')),
      interval '1 month'
    ) d
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

-- -----------------------------------------------------------------------------
-- Cumpleaños del mes: aviso a la alumna y a la profe (una vez por mes).
-- Se dispara desde /api/cron/birthdays (Vercel Cron) al comienzo de cada mes.
-- -----------------------------------------------------------------------------
create table if not exists public.birthday_notices (
  user_id uuid not null references public.profiles (id) on delete cascade,
  ym      text not null,
  primary key (user_id, ym)
);
alter table public.birthday_notices enable row level security;  -- sin policies: sólo funciones

drop function if exists public.enqueue_birthday_month_notices();
create or replace function public.enqueue_birthday_month_notices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ym    text := to_char((now() at time zone 'Europe/Madrid'), 'YYYY-MM');
  v_month int  := extract(month from (now() at time zone 'Europe/Madrid'))::int;
  r       record;
  v_count int := 0;
begin
  for r in
    select p.id, p.full_name, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'alumna'
      and p.birth_date is not null
      and extract(month from p.birth_date)::int = v_month
      and not exists (select 1 from public.birthday_notices bn
                      where bn.user_id = p.id and bn.ym = v_ym)
  loop
    insert into public.email_events (type, payload)
    values ('birthday_month', jsonb_build_object(
      'student_name', r.full_name, 'student_email', r.email, 'month_label', v_ym
    ));
    insert into public.birthday_notices (user_id, ym) values (r.id, v_ym);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.enqueue_birthday_month_notices() to service_role;

-- -----------------------------------------------------------------------------
-- birthdays_in_month()  — para marcar cumpleaños en el calendario del admin
-- -----------------------------------------------------------------------------
drop function if exists public.birthdays_in_month(integer, integer);
create or replace function public.birthdays_in_month(p_year integer, p_month integer)
returns table (day integer, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select extract(day from p.birth_date)::int, p.full_name
  from public.profiles p
  where p.role = 'alumna'
    and p.birth_date is not null
    and extract(month from p.birth_date)::int = p_month
    and public.is_admin()
  order by extract(day from p.birth_date);
$$;

grant execute on function public.birthdays_in_month(integer, integer) to authenticated;
