-- =============================================================================
-- Métodos de pago: efectivo · bizum · transferencia.
-- =============================================================================

-- Migrar valores viejos que ya no existen.
update public.payments set method = 'transferencia' where method = 'mercadopago';
update public.payments set method = 'efectivo'      where method = 'otro';

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('efectivo', 'bizum', 'transferencia'));
