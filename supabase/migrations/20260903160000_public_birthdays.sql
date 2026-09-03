-- =============================================================================
-- Cumpleaños visibles para toda la comunidad en el calendario (alumnas + admin).
-- Se quita el filtro is_admin(): cualquiera autenticada puede ver de quién es
-- el cumpleaños de cada día.
-- =============================================================================

drop function if exists public.birthdays_in_month(integer, integer);
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
    and auth.uid() is not null
  order by extract(day from p.birth_date), p.full_name;
$$;

grant execute on function public.birthdays_in_month(integer, integer) to authenticated;
