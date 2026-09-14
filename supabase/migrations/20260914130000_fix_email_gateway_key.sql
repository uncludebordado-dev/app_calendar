-- =============================================================================
-- El proyecto pasó al sistema nuevo de API keys de Supabase (publishable/secret,
-- reemplazan a anon/service_role). El gateway de Edge Functions ya no acepta
-- la anon key vieja como "apikey" -> el disparador de emails empezó a rebotar
-- con 401 antes de llegar a nuestro código.
--
-- La "publishable key" es pública a propósito (como lo era la anon key), por
-- eso puede ir escrita acá igual que la URL del proyecto.
-- =============================================================================
create or replace function public.dispatch_email_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_secrets where key = 'email_webhook_secret';

  if v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret,
      'apikey', 'sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6',
      'Authorization', 'Bearer sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;
