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
