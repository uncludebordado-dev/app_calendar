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


-- =============================================================================
-- Métodos de pago: efectivo · bizum · transferencia.
-- =============================================================================

-- Migrar valores viejos que ya no existen.
update public.payments set method = 'transferencia' where method = 'mercadopago';
update public.payments set method = 'efectivo'      where method = 'otro';

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('efectivo', 'bizum', 'transferencia'));


-- =============================================================================
-- admin_income_total(): total histórico recaudado (todas las clases cobradas,
-- sin filtrar por mes). El "total del mes" ya lo da admin_month_totals.
-- =============================================================================
drop function if exists public.admin_income_total();
create or replace function public.admin_income_total()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  return (select coalesce(sum(amount), 0) from public.payments);
end;
$$;
grant execute on function public.admin_income_total() to authenticated;


-- =============================================================================
-- Fotos de perfil:
--  - Google: se sigue usando la URL de Google.
--  - Resto: pueden subir una foto (bucket público "avatars", carpeta = uid).
--  - Admin: por defecto usa el logo del clu.
-- =============================================================================

-- Bucket público para las fotos de perfil.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lectura pública de las fotos.
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Cada quien sólo escribe en su propia carpeta (primer segmento = su uid).
drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- El/la admin usa el logo del clu como foto (si todavía no tiene una).
update public.profiles
   set avatar_url = '/icon-512.png'
 where role = 'admin'
   and (avatar_url is null or avatar_url = '');

-- Al crear la cuenta del admin, dejar el logo por defecto.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta   jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name   text;
  v_phone  text;
  v_bday   text;
  v_avatar text;
  v_role   text := 'alumna';
begin
  v_name   := trim(coalesce(v_meta ->> 'full_name', v_meta ->> 'name', ''));
  v_phone  := trim(coalesce(v_meta ->> 'phone_e164', ''));
  v_bday   := trim(coalesce(v_meta ->> 'birth_date', ''));
  v_avatar := nullif(trim(coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture', '')), '');

  if lower(new.email) = 'uncludebordado@gmail.com' then
    v_role := 'admin';
    v_avatar := coalesce(v_avatar, '/icon-512.png');
  end if;

  insert into public.profiles (id, full_name, phone_e164, role, birth_date, avatar_url)
  values (
    new.id,
    v_name,
    case when v_phone ~ '^\+[1-9][0-9]{6,14}$' then v_phone else '' end,
    v_role,
    case when v_bday ~ '^\d{4}-\d{2}-\d{2}$' then v_bday::date else null end,
    v_avatar
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


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


-- =============================================================================
-- Endurecimiento de seguridad (auditoría 2026-09-14):
--  1) El secreto del webhook de emails estaba hardcodeado en un .sql commiteado
--     al repo (público) -> se saca de cualquier archivo y se guarda en una
--     tabla privada que sólo puede leer la función SECURITY DEFINER.
--  2) payments.booking_id único (NULLs libres) -> evita pago duplicado si el
--     puntito se toca dos veces muy rápido.
--  3) Bucket "avatars": límites de tamaño y tipo a nivel de Storage (antes
--     sólo se validaban en el navegador).
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- -----------------------------------------------------------------------------
-- 1) Secretos fuera del código: schema "private", sin acceso para anon/authenticated.
-- -----------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_secrets (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated;
-- Sin policies: nadie entra salvo el dueño de la función SECURITY DEFINER de abajo.

create or replace function public.dispatch_email_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'email_webhook_secret';

  -- Si todavía no cargaste el secreto (ver instrucciones), no dispares el webhook.
  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret,
      -- Anon key del proyecto: es pública a propósito (misma que usa el navegador),
      -- la protección real es el x-webhook-secret de arriba.
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWx1eW5kZ2xzZnhnZ3F5eWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjE0NzQsImV4cCI6MjEwMzkzNzQ3NH0.9Xw-ctilbMhxOQm1udnCsf9qEApTSY335FTR3XtAWtg'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists email_events_dispatch on public.email_events;
create trigger email_events_dispatch
  after insert on public.email_events
  for each row execute function public.dispatch_email_event();

-- -----------------------------------------------------------------------------
-- 2) payments.booking_id único (permite muchos NULL, pero no 2 pagos para la
--    misma reserva) + admin_toggle_paid con upsert atómico (sin condición de
--    carrera entre el "exists" y el "insert/update").
-- -----------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_booking_id_key;
alter table public.payments add constraint payments_booking_id_key unique (booking_id);

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

    insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
    values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
            coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
    on conflict (booking_id) do update
      set amount = 10,
          method = coalesce(nullif(excluded.method, ''), public.payments.method);
  else
    update public.bookings
       set attended = null, no_show = false
     where id = p_booking_id;
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_paid(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Bucket "avatars": límite de tamaño (4 MB) y sólo tipos imagen, a nivel
--    de Storage (antes sólo se validaba en el navegador).
-- -----------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 4194304,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'avatars';


-- =============================================================================
-- El proyecto pasó al sistema nuevo de API keys de Supabase (publishable/secret,
-- reemplazan a anon/service_role). El gateway de Edge Functions ya no acepta
-- la anon key vieja como "apikey" -> el disparador de emails empezó a rebotar
-- con 401 antes de llegar a nuestro código.
--
-- La "publishable key" es pública a propósito (como lo era la anon key), por
-- eso puede ir escrita acá igual que la URL del proyecto.
-- =============================================================================
create or replace function public.dispatch_email_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'email_webhook_secret';

  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret,
      'apikey', 'sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6',
      'Authorization', 'Bearer sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;


-- =============================================================================
-- 1) Sanción por baja tardía (<24 h): se cobra la clase completa (10 €) igual.
--    Se suma a la sanción de 48h ya existente (strikes), no la reemplaza.
-- 2) Alumnas exentas de pago (profiles.payment_exempt): se les marca la
--    asistencia normalmente pero nunca se genera cobro ni entra en los totales.
-- =============================================================================

alter table public.profiles add column if not exists payment_exempt boolean not null default false;
comment on column public.profiles.payment_exempt is
  'Alumna que nunca genera cobro (10 €): sólo se le marca asistencia. P.ej. Dai, Chime.';

alter table public.bookings add column if not exists penalty_fee boolean not null default false;
comment on column public.bookings.penalty_fee is
  'true si la cancelación fue con menos de 24h y corresponde cobrar la clase igual.';

-- -----------------------------------------------------------------------------
-- cancel_booking(): agrega el umbral de 24h (cobro) sobre el de 48h (sanción).
-- -----------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_booking   public.bookings;
  v_slot      public.availability_slots;
  v_hours     numeric;
  v_late      boolean;   -- <48h: sanción (strike)
  v_penalty   boolean;   -- <24h: se cobra la clase igual
  v_exempt    boolean;
  v_strikes   smallint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;

  select * into v_slot from public.availability_slots where id = v_booking.slot_id;
  select coalesce(payment_exempt, false) into v_exempt
    from public.profiles where id = v_booking.user_id;

  v_hours   := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
  )) / 3600.0;
  v_late    := v_hours < 48;
  -- El cobro (como la sanción) sólo aplica cuando la cancela la propia dueña,
  -- no cuando la admin da de baja una clase por su cuenta.
  v_penalty := v_hours < 24 and v_booking.user_id = v_uid and not v_exempt;

  update public.bookings
     set status            = 'cancelled',
         cancelled_at      = now(),
         cancelled_by      = v_uid,
         late_cancellation = v_late,
         penalty_fee       = v_penalty
   where id = p_booking_id
  returning * into v_booking;

  update public.availability_slots
     set booked_count = greatest(booked_count - 1, 0)
   where id = v_booking.slot_id;

  -- Strike sólo si la cancela la propia alumna con menos de 48h (regla previa, sin cambios).
  if v_late and v_booking.user_id = v_uid then
    update public.profiles
       set strikes = strikes + 1,
           blocked = (strikes + 1) >= 3
     where id = v_booking.user_id
    returning strikes into v_strikes;
  end if;

  -- El aviso a la admin (con "se cobra igual: Sí") sale del mismo mail de baja
  -- de siempre: lo dispara el trigger enqueue_booking_email() de más abajo.

  return v_booking;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_toggle_paid(): respeta la exención de pago (sólo marca asistencia).
-- -----------------------------------------------------------------------------
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
  v_b      public.bookings;
  v_exempt boolean;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  select coalesce(payment_exempt, false) into v_exempt
    from public.profiles where id = v_b.user_id;

  if p_paid then
    update public.bookings
       set attended = true, no_show = false
     where id = p_booking_id;

    -- Exenta: se marca la asistencia y ya está, sin generar cobro ni total.
    if not v_exempt then
      insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
      values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
              coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
      on conflict (booking_id) do update
        set amount = 10,
            method = coalesce(nullif(excluded.method, ''), public.payments.method);
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

-- -----------------------------------------------------------------------------
-- admin_toggle_penalty_paid(): cobrar/descobrar la sanción de una baja <24h.
-- No toca "attended" (la clase no se dio, fue una baja) ni exentas.
-- -----------------------------------------------------------------------------
drop function if exists public.admin_toggle_penalty_paid(uuid, boolean, text);
create or replace function public.admin_toggle_penalty_paid(
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

  select * into v_b from public.bookings where id = p_booking_id and penalty_fee is true;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_paid then
    insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
    values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
            coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
    on conflict (booking_id) do update
      set amount = 10,
          method = coalesce(nullif(excluded.method, ''), public.payments.method);
  else
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_penalty_paid(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- admin_students_overview(): suma las bajas con cargo (penalty_fee) del mes,
-- y "paid" tiene en cuenta la exención (exenta + asistió = verde sin cobro real).
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- enqueue_booking_email(): suma "penalty_fee" al aviso de baja, para que el
-- mail a la alumna también le confirme que se le cobra la clase.
-- -----------------------------------------------------------------------------
create or replace function public.enqueue_booking_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type     text;
  v_user     record;
  v_slot     public.availability_slots;
begin
  if tg_op = 'INSERT' then
    v_type := 'booking_confirmed';
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'confirmed' then
    v_type := 'booking_cancelled';
  else
    return coalesce(new, old);
  end if;

  select p.full_name, p.phone_e164, u.email
    into v_user
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = new.user_id;

  select * into v_slot from public.availability_slots where id = new.slot_id;

  insert into public.email_events (type, booking_id, payload)
  values (
    v_type,
    new.id,
    jsonb_build_object(
      'booking_id',    new.id,
      'student_name',   v_user.full_name,
      'student_email',  v_user.email,
      'student_phone',  v_user.phone_e164,
      'class_date',     to_char(v_slot.class_date, 'YYYY-MM-DD'),
      'start_time',     to_char(v_slot.start_time, 'HH24:MI'),
      'end_time',       to_char(v_slot.end_time, 'HH24:MI'),
      'notes',          coalesce(v_slot.notes, ''),
      'late_cancellation', new.late_cancellation,
      'penalty_fee',       new.penalty_fee
    )
  );

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_student_detail(): suma payment_exempt para el toggle de la ficha.
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
  payment_exempt boolean,
  total_paid     numeric,
  payments_count bigint,
  attended       jsonb,
  payments       jsonb
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
    p.created_at::date, p.strikes, p.blocked, p.avatar_url, p.payment_exempt,
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

-- -----------------------------------------------------------------------------
-- Marcar a Dai como exenta de pago ahora. Chime todavía no se registró: cuando
-- lo haga, marcala desde su ficha en /admin/alumnas/[id] (checkbox "Exenta de
-- pago") — no hace falta tocar SQL de nuevo para ella.
-- -----------------------------------------------------------------------------
update public.profiles
   set payment_exempt = true
 where id = '5dd38d26-d100-4bf6-b35f-57792e3e22bd'  -- Dai Ciaramella
   and role = 'alumna';


-- =============================================================================
-- Kits editables desde el panel de admin (antes hardcodeados en el código).
-- =============================================================================
create table if not exists public.kits (
  id         text primary key check (id in ('basico', 'medium', 'pro')),
  name       text not null,
  tagline    text not null default '',
  items      jsonb not null default '[]'::jsonb,  -- array de strings
  sort_order smallint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.kits enable row level security;

drop policy if exists kits_select_authenticated on public.kits;
create policy kits_select_authenticated on public.kits
  for select using (auth.uid() is not null);

drop policy if exists kits_admin_write on public.kits;
create policy kits_admin_write on public.kits
  for all using (public.is_admin()) with check (public.is_admin());

-- Semilla con la info que ya existía hardcodeada (no pisa ediciones futuras).
insert into public.kits (id, name, tagline, items, sort_order) values
  ('basico', 'Kit Básico', 'Para empezar a bordar hoy', jsonb_build_array(
    'Bastidor de madera 15 cm', 'Aguja de bordar', 'Hilos en 5 colores',
    'Tela de algodón', 'Guía de puntadas impresa'
  ), 1),
  ('medium', 'Kit Medium', 'El más elegido del clu', jsonb_build_array(
    'Bastidor de madera 20 cm', 'Set de 3 agujas', 'Hilos en 12 colores',
    '2 telas (algodón y lino)', 'Tijera de bordado', 'Guía + patrón para calcar'
  ), 2),
  ('pro', 'Kit Pro', 'Todo lo que necesitás y más', jsonb_build_array(
    'Bastidor 25 cm con soporte de mesa', 'Set completo de agujas + enhebrador',
    'Hilos en 24 colores', 'Telas variadas', 'Tijera de bordado',
    'Librito de puntadas', 'Bolso para llevar tu bordado'
  ), 3)
on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists kits_touch_updated_at on public.kits;
create trigger kits_touch_updated_at
  before update on public.kits
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- Notificaciones push al celular cuando se publica una News.
-- Mismo patrón que los emails: la tabla privada guarda el secreto, un trigger
-- avisa a una Edge Function nueva (send-news-push) que manda el push real.
-- =============================================================================

-- Para el puntito naranja de "hay novedades" en el nav.
alter table public.profiles add column if not exists news_last_seen_at timestamptz;

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subs_owner on public.push_subscriptions;
create policy push_subs_owner on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- La Edge Function necesita leer todas las suscripciones: sólo service_role
-- (ya bypassea RLS), no hace falta policy extra para eso.

create or replace function public.dispatch_news_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'news_push_secret';
  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-news-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret,
      'apikey', 'sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6',
      'Authorization', 'Bearer sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6'
    ),
    body := jsonb_build_object(
      'post_id', new.id,
      'title',   new.title,
      'body',    new.body
    )
  );
  return new;
end;
$$;

drop trigger if exists news_posts_push on public.news_posts;
create trigger news_posts_push
  after insert on public.news_posts
  for each row execute function public.dispatch_news_push();


-- =============================================================================
-- Kits: precio + foto (antes sólo nombre/bajada/items).
-- =============================================================================
alter table public.kits add column if not exists price_eur numeric(10, 2);
alter table public.kits add column if not exists photo_url text;

-- Bucket para las fotos de los kits: público (se ve en "Reservá tu kit"),
-- sólo la admin puede subir/reemplazar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kit-photos', 'kit-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kit-photos public read" on storage.objects;
create policy "kit-photos public read" on storage.objects
  for select using (bucket_id = 'kit-photos');

drop policy if exists "kit-photos admin write" on storage.objects;
create policy "kit-photos admin write" on storage.objects
  for insert with check (bucket_id = 'kit-photos' and public.is_admin());

drop policy if exists "kit-photos admin update" on storage.objects;
create policy "kit-photos admin update" on storage.objects
  for update using (bucket_id = 'kit-photos' and public.is_admin());

drop policy if exists "kit-photos admin delete" on storage.objects;
create policy "kit-photos admin delete" on storage.objects
  for delete using (bucket_id = 'kit-photos' and public.is_admin());


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


-- =============================================================================
-- 1) La baja <24h marca "penalty_fee" (bolita amarilla) también para alumnas
--    exentas -- lo que cambia es que nunca se les genera el cobro real.
-- 2) admin_toggle_penalty_paid(): si la alumna es exenta, no genera pago.
-- 3) enqueue_monthly_report(): ahora cubre el MES EN CURSO (se dispara el
--    último día del mes, a la noche, así entra la clase de ese mismo día);
--    suma el listado de alumnas con sus "bolitas" del mes; evita duplicados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cancel_booking(): la bolita amarilla se marca igual para exentas.
-- -----------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_booking   public.bookings;
  v_slot      public.availability_slots;
  v_hours     numeric;
  v_late      boolean;
  v_penalty   boolean;
  v_strikes   smallint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.user_id <> v_uid and not public.is_admin() then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  if v_booking.status = 'cancelled' then
    raise exception 'already_cancelled' using errcode = 'P0001';
  end if;

  select * into v_slot from public.availability_slots where id = v_booking.slot_id;

  v_hours   := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
  )) / 3600.0;
  v_late    := v_hours < 48;
  -- La marca (bolita amarilla) es igual para todas; lo que varía por exención
  -- es si eso genera o no un cobro real (ver admin_toggle_penalty_paid).
  v_penalty := v_hours < 24 and v_booking.user_id = v_uid;

  update public.bookings
     set status            = 'cancelled',
         cancelled_at      = now(),
         cancelled_by      = v_uid,
         late_cancellation = v_late,
         penalty_fee       = v_penalty
   where id = p_booking_id
  returning * into v_booking;

  update public.availability_slots
     set booked_count = greatest(booked_count - 1, 0)
   where id = v_booking.slot_id;

  if v_late and v_booking.user_id = v_uid then
    update public.profiles
       set strikes = strikes + 1,
           blocked = (strikes + 1) >= 3
     where id = v_booking.user_id
    returning strikes into v_strikes;
  end if;

  return v_booking;
end;
$$;

-- -----------------------------------------------------------------------------
-- admin_toggle_penalty_paid(): rechaza el cobro si la alumna es exenta.
-- -----------------------------------------------------------------------------
create or replace function public.admin_toggle_penalty_paid(
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
  v_b      public.bookings;
  v_exempt boolean;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;

  select * into v_b from public.bookings where id = p_booking_id and penalty_fee is true;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if p_paid then
    select coalesce(payment_exempt, false) into v_exempt
      from public.profiles where id = v_b.user_id;
    if v_exempt then
      raise exception 'alumna_exenta' using errcode = 'P0001';
    end if;

    insert into public.payments (user_id, slot_id, booking_id, amount, method, created_by)
    values (v_b.user_id, v_b.slot_id, p_booking_id, 10,
            coalesce(nullif(p_method, ''), 'efectivo'), auth.uid())
    on conflict (booking_id) do update
      set amount = 10,
          method = coalesce(nullif(excluded.method, ''), public.payments.method);
  else
    delete from public.payments where booking_id = p_booking_id;
  end if;
end;
$$;
grant execute on function public.admin_toggle_penalty_paid(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- enqueue_monthly_report() v2: mes en curso + listado de alumnas con bolitas.
-- -----------------------------------------------------------------------------
drop function if exists public.enqueue_monthly_report();
create or replace function public.enqueue_monthly_report()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today       date := (now() at time zone 'Europe/Madrid')::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_month_end   date := v_today;  -- se dispara el último día del mes
  v_ym          text := to_char(v_today, 'YYYY-MM');
  v_label       text := initcap(to_char(v_month_start, 'TMMonth YYYY'));
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
  -- Evita mandarlo dos veces si el cron se dispara más de una vez el mismo día.
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

  -- Listado de alumnas del mes con sus "bolitas" (reservas + bajas con cargo).
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
    and (sb.user_id is not null); -- sólo alumnas con actividad ese mes

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
-- (email_events ya tiene policy de select para admin desde el schema original.)


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
