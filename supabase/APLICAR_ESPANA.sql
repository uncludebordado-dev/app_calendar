-- =============================================================================
-- un clu de bordado — CORRER TODO ESTO en el SQL Editor de Supabase (una vez).
-- Panel + zona horaria España + rediseño + roadmap (puntitos, dashboard, kits, cumpleaños).
-- =============================================================================

-- ================================================================
-- 20260903120000_dashboard.sql
-- ================================================================

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

-- ================================================================
-- 20260903130000_timezone_madrid.sql
-- ================================================================

-- =============================================================================
-- Cambio de zona horaria del taller a Europe/Madrid.
-- Re-crea book_slot() y cancel_booking() (dashboard.sql ya viene con Madrid).
-- =============================================================================

create or replace function public.book_slot(p_slot_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile public.profiles;
  v_slot    public.availability_slots;
  v_rows    integer;
  v_booking public.bookings;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.full_name = '' or v_profile.phone_e164 = '' then
    raise exception 'profile_incomplete' using errcode = 'P0001';
  end if;
  if v_profile.blocked then
    raise exception 'user_blocked' using errcode = 'P0001';
  end if;

  -- ¿ya tiene reserva activa en esta franja?
  if exists (
    select 1 from public.bookings
    where slot_id = p_slot_id and user_id = v_uid and status = 'confirmed'
  ) then
    raise exception 'already_booked' using errcode = 'P0001';
  end if;

  select * into v_slot from public.availability_slots where id = p_slot_id;
  if not found or not v_slot.is_published then
    raise exception 'slot_not_found' using errcode = 'P0001';
  end if;
  if (v_slot.class_date + v_slot.start_time)
       <= (now() at time zone 'Europe/Madrid') then
    raise exception 'slot_past' using errcode = 'P0001';
  end if;

  -- UPDATE condicional: sólo incrementa si queda cupo. Gana la carrera.
  update public.availability_slots
     set booked_count = booked_count + 1
   where id = p_slot_id
     and is_published
     and booked_count < capacity;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  insert into public.bookings (slot_id, user_id)
  values (p_slot_id, v_uid)
  returning * into v_booking;

  return v_booking;
end;
$$;

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

  v_hours := extract(epoch from (
    (v_slot.class_date + v_slot.start_time) - (now() at time zone 'Europe/Madrid')
  )) / 3600.0;
  v_late := v_hours < 48;

  update public.bookings
     set status            = 'cancelled',
         cancelled_at       = now(),
         cancelled_by       = v_uid,
         late_cancellation  = v_late
   where id = p_booking_id
  returning * into v_booking;

  update public.availability_slots
     set booked_count = greatest(booked_count - 1, 0)
   where id = v_booking.slot_id;

  -- Strike sólo si la cancela la propia alumna con menos de 48h.
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


-- ================================================================
-- 20260903140000_ux_features.sql
-- ================================================================

-- =============================================================================
-- Rediseño UX: avatar, preferencia de notificaciones, aviso de alta, chat grupal.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: avatar + preferencia de notificaciones
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists notifications_enabled boolean not null default true;

-- Alta de usuario: captura también el avatar de Google (picture / avatar_url).
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

-- -----------------------------------------------------------------------------
-- email_events: nuevo tipo 'user_registered'
-- -----------------------------------------------------------------------------
alter table public.email_events drop constraint if exists email_events_type_check;
alter table public.email_events add constraint email_events_type_check
  check (type in ('booking_confirmed', 'booking_cancelled', 'user_registered'));

-- Encola un aviso cuando una alumna completa su perfil (nombre + teléfono).
create or replace function public.enqueue_registration_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Sólo cuando el perfil pasa a estar completo por primera vez.
  if new.full_name = '' or new.phone_e164 = '' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.full_name <> '' and old.phone_e164 <> '' then
    return new; -- ya estaba completo
  end if;
  if new.role = 'admin' then
    return new;
  end if;

  select email into v_email from auth.users where id = new.id;

  insert into public.email_events (type, payload)
  values (
    'user_registered',
    jsonb_build_object(
      'student_name',  new.full_name,
      'student_email', v_email,
      'student_phone', new.phone_e164,
      'birth_date',    coalesce(to_char(new.birth_date, 'YYYY-MM-DD'), '')
    )
  );

  return new;
end;
$$;

drop trigger if exists profiles_registration_email_ins on public.profiles;
create trigger profiles_registration_email_ins
  after insert on public.profiles
  for each row execute function public.enqueue_registration_email();

drop trigger if exists profiles_registration_email_upd on public.profiles;
create trigger profiles_registration_email_upd
  after update of full_name, phone_e164 on public.profiles
  for each row execute function public.enqueue_registration_email();

-- -----------------------------------------------------------------------------
-- messages: chat grupal único ("Sala del clu")
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  body       text        not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_at);

alter table public.messages enable row level security;

-- Cualquier usuaria autenticada con perfil completo lee y escribe en la sala.
drop policy if exists messages_select_authenticated on public.messages;
create policy messages_select_authenticated on public.messages
  for select using (auth.uid() is not null);

drop policy if exists messages_insert_own on public.messages;
create policy messages_insert_own on public.messages
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.full_name <> '' and p.phone_e164 <> ''
    )
  );

-- La autora puede borrar su propio mensaje; la admin puede borrar cualquiera.
drop policy if exists messages_delete_own_or_admin on public.messages;
create policy messages_delete_own_or_admin on public.messages
  for delete using (user_id = auth.uid() or public.is_admin());

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Vista para leer mensajes con nombre + avatar de la autora sin exponer otros campos.
create or replace function public.chat_messages(p_limit integer default 100, p_before bigint default null)
returns table (
  id         bigint,
  user_id    uuid,
  body       text,
  created_at timestamptz,
  author_name   text,
  author_avatar text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.user_id, m.body, m.created_at, p.full_name, p.avatar_url
  from public.messages m
  join public.profiles p on p.id = m.user_id
  where auth.uid() is not null
    and (p_before is null or m.id < p_before)
  order by m.id desc
  limit greatest(1, least(p_limit, 200));
$$;

grant execute on function public.chat_messages(integer, bigint) to authenticated;

-- ================================================================
-- 20260903150000_roadmap.sql
-- ================================================================

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
