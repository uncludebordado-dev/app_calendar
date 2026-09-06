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
