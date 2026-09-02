-- =============================================================================
-- Row Level Security — habilitado en TODAS las tablas.
-- Regla general: cada alumna sólo ve/edita lo suyo; sólo la admin ve el resto.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings           enable row level security;
alter table public.email_events       enable row level security;
alter table public.rate_limits        enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- El trigger profiles_guard() impide que una alumna cambie role/strikes/blocked.
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- (sin policy de DELETE: los profiles se borran por cascade de auth.users)

-- -----------------------------------------------------------------------------
-- availability_slots
--   lectura: cualquier usuaria autenticada ve las publicadas; la admin ve todo
--   escritura: sólo admin
-- -----------------------------------------------------------------------------
drop policy if exists slots_select_published_or_admin on public.availability_slots;
create policy slots_select_published_or_admin on public.availability_slots
  for select using (
    (auth.uid() is not null and is_published) or public.is_admin()
  );

drop policy if exists slots_admin_insert on public.availability_slots;
create policy slots_admin_insert on public.availability_slots
  for insert with check (public.is_admin());

drop policy if exists slots_admin_update on public.availability_slots;
create policy slots_admin_update on public.availability_slots
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists slots_admin_delete on public.availability_slots;
create policy slots_admin_delete on public.availability_slots
  for delete using (public.is_admin());

-- -----------------------------------------------------------------------------
-- bookings
--   lectura: la alumna ve las suyas; la admin ve todas
--   INSERT/UPDATE/DELETE directos: DENEGADOS. Sólo vía book_slot()/cancel_booking()
--   (SECURITY DEFINER -> corren como owner y saltan RLS).
-- -----------------------------------------------------------------------------
drop policy if exists bookings_select_own_or_admin on public.bookings;
create policy bookings_select_own_or_admin on public.bookings
  for select using (user_id = auth.uid() or public.is_admin());

-- Sin policies de insert/update/delete => nadie puede hacerlo con la anon/auth key.

-- -----------------------------------------------------------------------------
-- email_events — sólo admin puede mirar la cola. Nada de escritura desde el cliente.
-- -----------------------------------------------------------------------------
drop policy if exists email_events_admin_select on public.email_events;
create policy email_events_admin_select on public.email_events
  for select using (public.is_admin());

-- -----------------------------------------------------------------------------
-- rate_limits — sin policies: inaccesible con anon/auth key.
-- Sólo check_rate_limit() (SECURITY DEFINER) la toca.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Grants de ejecución de funciones
-- -----------------------------------------------------------------------------
grant execute on function public.book_slot(uuid)        to authenticated;
grant execute on function public.cancel_booking(uuid)   to authenticated;
grant execute on function public.mark_no_show(uuid)     to authenticated; -- validación interna: is_admin()
grant execute on function public.reset_strikes(uuid)    to authenticated; -- idem
grant execute on function public.is_admin()             to authenticated;

-- check_rate_limit se invoca sólo con service role (ver src/lib/rate-limit.ts)
