-- =============================================================================
-- Pedidos de kits para la admin: lista con nombre, teléfono y email de cada
-- alumna (el email vive en auth.users, por eso va en una función SECURITY
-- DEFINER que exige is_admin()).
-- =============================================================================

drop function if exists public.admin_kit_orders();
create or replace function public.admin_kit_orders()
returns table (
  id          uuid,
  kit         text,
  quantity    smallint,
  note        text,
  status      text,
  created_at  timestamptz,
  user_id     uuid,
  full_name   text,
  phone_e164  text,
  email       text
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
  select o.id, o.kit, o.quantity, o.note, o.status, o.created_at,
         o.user_id, p.full_name, p.phone_e164, u.email::text
    from public.kit_orders o
    join public.profiles p on p.id = o.user_id
    join auth.users u on u.id = o.user_id
   order by o.created_at desc;
end;
$$;

grant execute on function public.admin_kit_orders() to authenticated;
