-- =============================================================================
-- Conectar la cola de emails con la Edge Function (reemplaza al Database Webhook).
-- Correr UNA vez en el SQL Editor de Supabase, DESPUÉS de:
--   1) haber corrido APLICAR_ESPANA.sql
--   2) haber desplegado la Edge Function `send-booking-emails`
--   3) haber cargado sus secrets (RESEND_API_KEY, EMAIL_WEBHOOK_SECRET, etc.)
-- =============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.dispatch_email_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '033d0fd1212218378017afb59f04e508840aa41d8cb7643a',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWx1eW5kZ2xzZnhnZ3F5eWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjE0NzQsImV4cCI6MjEwMzkzNzQ3NH0.9Xw-ctilbMhxOQm1udnCsf9qEApTSY335FTR3XtAWtg'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists email_events_dispatch on public.email_events;
create trigger email_events_dispatch
  after insert on public.email_events
  for each row execute function public.dispatch_email_event();

-- Reprocesar pendientes viejos (opcional):
-- update public.email_events set created_at = now() where processed_at is null;
