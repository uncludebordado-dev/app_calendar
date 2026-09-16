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
