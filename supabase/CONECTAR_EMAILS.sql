-- =============================================================================
-- Conectar la cola de emails con la Edge Function (reemplaza al Database Webhook).
--
-- IMPORTANTE (seguridad): el secreto del webhook YA NO va en este archivo ni en
-- ningún otro archivo del repo. Se guarda en una tabla privada de la base
-- (private.app_secrets), creada por la migración 20260914120000_security_hardening.sql.
--
-- Pasos, EN ESTE ORDEN:
--   1) Correr supabase/APLICAR_AHORA.sql (o al menos la migración de arriba).
--   2) Haber desplegado la Edge Function `send-booking-emails`.
--   3) Cargarle sus secrets en Supabase (Edge Functions > send-booking-emails >
--      Secrets): RESEND_API_KEY, RESEND_FROM, ADMIN_EMAIL, EMAIL_WEBHOOK_SECRET.
--      Usá un valor largo y aleatorio para EMAIL_WEBHOOK_SECRET.
--   4) Pegar ACÁ ABAJO ese MISMO valor de EMAIL_WEBHOOK_SECRET y correr sólo
--      este bloque en el SQL Editor. NO subas este archivo a git con el valor
--      real adentro — dejalo siempre con el placeholder antes de guardar.
-- =============================================================================

insert into private.app_secrets (key, value)
values ('email_webhook_secret', 'PEGÁ_ACÁ_TU_EMAIL_WEBHOOK_SECRET_Y_NO_LO_COMMITEES')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Reprocesar pendientes viejos (opcional):
-- update public.email_events set created_at = now() where processed_at is null;
