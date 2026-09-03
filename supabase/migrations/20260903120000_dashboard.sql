-- =============================================================================
-- Panel de administración: fecha de nacimiento, pagos y métricas mensuales.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles.birth_date  (para cumpleaños)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists birth_date date;

comment on column public.profiles.birth_date is 'Fecha de nacimiento (la carga la alumna en su perfil). Google no la provee en el login.';

-- Alta de usuario: si viene birth_date en el metadata, guardarla.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name  text;
  v_phone text;
  v_bday  text;
  v_role  text := 'alumna';
begin
  v_name  := trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', ''));
  v_phone := trim(coalesce(v_meta ->> 'phone_e164', ''));
  v_bday  := trim(coalesce(v_meta ->> 'birth_date', ''));

  if lower(new.email) = 'uncludebordado@gmail.com' then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, full_name, phone_e164, role, birth_date)
  values (
    new.id,
    v_name,
    case when v_phone ~ '^\+[1-9][0-9]{6,14}$' then v_phone else '' end,
    v_role,
    case when v_bday ~ '^\d{4}-\d{2}-\d{2}$' then v_bday::date else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- payments  (pagos de clases — sólo la admin)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  slot_id     uuid        references public.availability_slots (id) on delete set null,
  amount      numeric(10, 2),
  method      text        not null default 'efectivo'
                check (method in ('efectivo', 'transferencia', 'mercadopago', 'otro')),
  paid_on     date        not null default (now() at time zone 'Europe/Madrid')::date,
  note        text,
  created_by  uuid        references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.payments is 'Pagos registrados por la admin. amount es opcional (puede llevar sólo registro de "pagó").';

create index if not exists payments_user_idx  on public.payments (user_id, paid_on desc);
create index if not exists payments_month_idx on public.payments (paid_on);

alter table public.payments enable row level security;

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- record_payment()  — alta de pago (admin)
-- -----------------------------------------------------------------------------
create or replace function public.record_payment(
  p_user_id uuid,
  p_slot_id uuid,
  p_amount  numeric,
  p_method  text,
  p_paid_on date,
  p_note    text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  insert into public.payments (user_id, slot_id, amount, method, paid_on, note, created_by)
  values (
    p_user_id,
    p_slot_id,
    p_amount,
    coalesce(nullif(p_method, ''), 'efectivo'),
    coalesce(p_paid_on, (now() at time zone 'Europe/Madrid')::date),
    nullif(trim(coalesce(p_note, '')), ''),
    auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.record_payment(uuid, uuid, numeric, text, date, text) to authenticated;

create or replace function public.delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  delete from public.payments where id = p_payment_id;
end;
$$;

grant execute on function public.delete_payment(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_month_summary()  — una fila por alumna con métricas del mes
-- -----------------------------------------------------------------------------
create or replace function public.admin_month_summary(p_from date, p_to date)
returns table (
  user_id         uuid,
  full_name       text,
  phone_e164      text,
  email           text,
  birth_date      date,
  strikes         smallint,
  blocked         boolean,
  reserved_count  bigint,   -- reservas confirmadas con clase en el mes
  attended_count  bigint,   -- de esas, clases ya pasadas sin inasistencia
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
    p.id, p.full_name, p.phone_e164, u.email, p.birth_date, p.strikes, p.blocked,
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

grant execute on function public.admin_month_summary(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_month_totals()  — números globales del mes
-- -----------------------------------------------------------------------------
drop function if exists public.admin_month_totals(date, date);
create or replace function public.admin_month_totals(p_from date, p_to date)
returns table (
  classes_count      bigint,
  reservations_count  bigint,
  attended_count      bigint,
  noshow_count        bigint,
  income_total        numeric,
  active_students     bigint
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
       where s.class_date between p_from and p_to and b.status = 'confirmed' and b.no_show = false
         and (s.class_date + s.start_time) < (now() at time zone 'Europe/Madrid')),
    (select count(*) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.no_show),
    (select coalesce(sum(amount), 0) from public.payments where paid_on between p_from and p_to),
    (select count(distinct b.user_id) from public.bookings b join public.availability_slots s on s.id = b.slot_id
       where s.class_date between p_from and p_to and b.status = 'confirmed');
end;
$$;

grant execute on function public.admin_month_totals(date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_upcoming_birthdays()  — cumpleaños dentro de los próximos N días
-- -----------------------------------------------------------------------------
create or replace function public.admin_upcoming_birthdays(p_days integer default 45)
returns table (
  user_id       uuid,
  full_name     text,
  phone_e164    text,
  birth_date    date,
  next_birthday date,
  turning_age   integer,
  days_until    integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Europe/Madrid')::date;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  return query
  with b as (
    select
      p.id, p.full_name, p.phone_e164, p.birth_date,
      (
        case
          when make_date(extract(year from v_today)::int,
                         extract(month from p.birth_date)::int,
                         extract(day from p.birth_date)::int) >= v_today
          then make_date(extract(year from v_today)::int,
                         extract(month from p.birth_date)::int,
                         extract(day from p.birth_date)::int)
          else make_date(extract(year from v_today)::int + 1,
                         extract(month from p.birth_date)::int,
                         extract(day from p.birth_date)::int)
        end
      ) as next_bday
    from public.profiles p
    where p.role = 'alumna' and p.birth_date is not null
  )
  select
    b.id, b.full_name, b.phone_e164, b.birth_date, b.next_bday,
    (extract(year from age(b.next_bday, b.birth_date))::int),
    (b.next_bday - v_today)::int
  from b
  where (b.next_bday - v_today) <= p_days
  order by b.next_bday;
end;
$$;

grant execute on function public.admin_upcoming_birthdays(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_student_ledger()  — historial de pagos + próximas reservas de una alumna
-- -----------------------------------------------------------------------------
create or replace function public.admin_student_payments(p_user_id uuid)
returns table (
  id       uuid,
  amount   numeric,
  method   text,
  paid_on  date,
  note     text,
  slot_id  uuid,
  class_date date
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
  select pm.id, pm.amount, pm.method, pm.paid_on, pm.note, pm.slot_id, s.class_date
    from public.payments pm
    left join public.availability_slots s on s.id = pm.slot_id
   where pm.user_id = p_user_id
   order by pm.paid_on desc, pm.created_at desc;
end;
$$;

grant execute on function public.admin_student_payments(uuid) to authenticated;
