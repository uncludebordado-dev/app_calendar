-- =============================================================================
-- APLICAR_AHORA.sql — pegá TODO en Supabase > SQL Editor > Run.
-- Incluye: fix del panel (email::text) + News + ficha de alumna +
--          inicio en septiembre + puntito rojo/verde (10 € por clase).
-- Se puede correr las veces que quieras.
-- =============================================================================


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


-- =============================================================================
-- 1) "News": la sala de chat pasa a ser un tablón de noticias.
--    - Sólo la admin publica.
--    - Las alumnas sólo reaccionan con un emoji (like / feliz / risa / triste).
-- 2) admin_student_detail(): ficha de una alumna (asistencias del año, total
--    pagado histórico, cumpleaños).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- news_posts
-- -----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id         bigint generated always as identity primary key,
  author_id  uuid        not null references public.profiles (id) on delete cascade,
  title      text        not null check (char_length(title) between 1 and 160),
  body       text        not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists news_posts_created_idx on public.news_posts (created_at desc);
alter table public.news_posts enable row level security;

drop policy if exists news_posts_select on public.news_posts;
create policy news_posts_select on public.news_posts
  for select using (auth.uid() is not null);

drop policy if exists news_posts_admin_write on public.news_posts;
create policy news_posts_admin_write on public.news_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- news_reactions  (una por persona por post)
-- -----------------------------------------------------------------------------
create table if not exists public.news_reactions (
  post_id    bigint      not null references public.news_posts (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  emoji      text        not null check (emoji in ('like', 'feliz', 'risa', 'triste')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.news_reactions enable row level security;

drop policy if exists news_reactions_select on public.news_reactions;
create policy news_reactions_select on public.news_reactions
  for select using (auth.uid() is not null);

drop policy if exists news_reactions_write_own on public.news_reactions;
create policy news_reactions_write_own on public.news_reactions
  for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.full_name <> '' and p.phone_e164 <> '')
  );

-- Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_posts') then
    alter publication supabase_realtime add table public.news_posts;
  end if;
  if not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_reactions') then
    alter publication supabase_realtime add table public.news_reactions;
  end if;
end $$;

-- Feed: post + conteo por emoji + mi reacción.
drop function if exists public.news_feed(integer);
create or replace function public.news_feed(p_limit integer default 50)
returns table (
  id           bigint,
  title        text,
  body         text,
  created_at   timestamptz,
  author_name  text,
  author_avatar text,
  reactions    jsonb,
  my_reaction  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id, n.title, n.body, n.created_at,
    p.full_name, p.avatar_url,
    jsonb_build_object(
      'like',   count(*) filter (where r.emoji = 'like'),
      'feliz',  count(*) filter (where r.emoji = 'feliz'),
      'risa',   count(*) filter (where r.emoji = 'risa'),
      'triste', count(*) filter (where r.emoji = 'triste')
    ),
    max(r.emoji) filter (where r.user_id = auth.uid())
  from public.news_posts n
  join public.profiles p on p.id = n.author_id
  left join public.news_reactions r on r.post_id = n.id
  where auth.uid() is not null
  group by n.id, p.full_name, p.avatar_url
  order by n.created_at desc
  limit greatest(1, least(p_limit, 200));
$$;
grant execute on function public.news_feed(integer) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_student_detail()  — ficha de una alumna
-- -----------------------------------------------------------------------------
drop function if exists public.admin_student_detail(uuid);
create or replace function public.admin_student_detail(p_user_id uuid)
returns table (
  full_name      text,
  email          text,
  phone_e164     text,
  birth_date     date,
  registered_on  date,
  strikes        smallint,
  blocked        boolean,
  avatar_url     text,
  total_paid     numeric,
  payments_count bigint,
  attended       jsonb,   -- asistencias del año en curso
  payments       jsonb    -- histórico de pagos
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from (now() at time zone 'Europe/Madrid'))::int;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  return query
  select
    p.full_name, u.email::text, p.phone_e164, p.birth_date,
    p.created_at::date, p.strikes, p.blocked, p.avatar_url,
    coalesce((select sum(amount) from public.payments where user_id = p_user_id), 0),
    (select count(*) from public.payments where user_id = p_user_id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'class_date', to_char(s.class_date, 'YYYY-MM-DD'),
        'start_time', to_char(s.start_time, 'HH24:MI'),
        'end_time',   to_char(s.end_time, 'HH24:MI'),
        'notes',      s.notes
      ) order by s.class_date, s.start_time)
      from public.bookings b
      join public.availability_slots s on s.id = b.slot_id
      where b.user_id = p_user_id
        and b.attended is true
        and extract(year from s.class_date)::int = v_year
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',       pm.id,
        'paid_on',  to_char(pm.paid_on, 'YYYY-MM-DD'),
        'amount',   pm.amount,
        'method',   pm.method,
        'note',     pm.note
      ) order by pm.paid_on desc, pm.created_at desc)
      from public.payments pm
      where pm.user_id = p_user_id
    ), '[]'::jsonb)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = p_user_id and p.role = 'alumna';
end;
$$;
grant execute on function public.admin_student_detail(uuid) to authenticated;


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
