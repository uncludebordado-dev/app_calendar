-- =============================================================================
-- Protección de datos:
--  1) Registro de la aceptación de la política de privacidad.
--  2) Cobros que sobreviven, anonimizados, cuando una alumna elimina su cuenta
--     (payments.user_id pasa a ser opcional y se pone en null al borrar).
--  3) prepare_account_deletion(): limpia lo que el borrado en cascada no ajusta
--     (cupos y avisos en cola con datos personales). Solo service_role.
--  4) inactive_account_ids(): cuentas sin actividad para anonimizar (24 meses).
-- =============================================================================

-- 1) Consentimiento ------------------------------------------------------------
alter table public.profiles add column if not exists privacy_accepted_at timestamptz;
alter table public.profiles add column if not exists privacy_version text;

comment on column public.profiles.privacy_accepted_at is
  'Momento en que la persona aceptó la política de privacidad y confirmó ser mayor de 18.';

-- 2) Cobros anonimizables -------------------------------------------------------
alter table public.payments alter column user_id drop not null;

do $$
declare
  v_con text;
begin
  select c.conname into v_con
    from pg_constraint c
   where c.conrelid = 'public.payments'::regclass
     and c.contype = 'f'
     and c.confrelid = 'public.profiles'::regclass
     and exists (
       select 1 from unnest(c.conkey) k
        where k = (select attnum from pg_attribute
                    where attrelid = 'public.payments'::regclass and attname = 'user_id')
     );
  if v_con is not null then
    execute format('alter table public.payments drop constraint %I', v_con);
  end if;
  alter table public.payments
    add constraint payments_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete set null;
end $$;

-- 3) Preparar el borrado de una cuenta ----------------------------------------
create or replace function public.prepare_account_deletion(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = p_user;

  -- Devolver el cupo de sus reservas confirmadas antes de borrarlas.
  update public.availability_slots s
     set booked_count = greatest(s.booked_count - c.n, 0)
    from (
      select slot_id, count(*)::int as n
        from public.bookings
       where user_id = p_user and status = 'confirmed'
       group by slot_id
    ) c
   where s.id = c.slot_id;

  -- Avisos en cola con nombre, email y teléfono de la persona.
  delete from public.email_events
   where booking_id in (select id from public.bookings where user_id = p_user)
      or (v_email is not null and payload ->> 'student_email' = v_email);

  -- Se borran sus reservas aquí (no en cascada) para que reintentar sea seguro.
  delete from public.bookings where user_id = p_user;

  -- Los cobros se conservan sin nombre (obligación contable); se limpia la nota.
  update public.payments set note = null where user_id = p_user;
end;
$$;

revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

-- 4) Cuentas inactivas ---------------------------------------------------------
create or replace function public.inactive_account_ids(p_months integer default 24, p_limit integer default 20)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.role = 'alumna'
     and coalesce(u.last_sign_in_at, u.created_at) < now() - make_interval(months => p_months)
     and not exists (
       select 1 from public.bookings b
        where b.user_id = p.id
          and b.created_at > now() - make_interval(months => p_months)
     )
     and not exists (
       select 1 from public.kit_orders k
        where k.user_id = p.id
          and k.created_at > now() - make_interval(months => p_months)
     )
   order by coalesce(u.last_sign_in_at, u.created_at)
   limit greatest(p_limit, 0);
$$;

revoke all on function public.inactive_account_ids(integer, integer) from public, anon, authenticated;
grant execute on function public.inactive_account_ids(integer, integer) to service_role;
