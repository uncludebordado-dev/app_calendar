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
