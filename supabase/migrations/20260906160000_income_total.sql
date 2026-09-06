-- =============================================================================
-- admin_income_total(): total histórico recaudado (todas las clases cobradas,
-- sin filtrar por mes). El "total del mes" ya lo da admin_month_totals.
-- =============================================================================
drop function if exists public.admin_income_total();
create or replace function public.admin_income_total()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = 'P0001';
  end if;
  return (select coalesce(sum(amount), 0) from public.payments);
end;
$$;
grant execute on function public.admin_income_total() to authenticated;
