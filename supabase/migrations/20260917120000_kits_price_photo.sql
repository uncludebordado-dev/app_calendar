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
