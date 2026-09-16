-- =============================================================================
-- Aviso por WhatsApp a la admin cuando se reserva un kit (además del mail que
-- ya existía). Mismo patrón que el email/push: un secreto en private.app_secrets
-- protege el llamado a la Edge Function nueva send-kit-whatsapp.
-- =============================================================================

create or replace function public.dispatch_kit_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, private
as $$
declare
  v_secret text;
  v_name   text;
  v_phone  text;
  v_email  text;
begin
  select value into v_secret from private.app_secrets where key = 'kit_whatsapp_secret';
  if v_secret is null or v_secret = '' then
    return new;
  end if;

  select p.full_name, p.phone_e164, u.email
    into v_name, v_phone, v_email
    from public.profiles p join auth.users u on u.id = p.id
   where p.id = new.user_id;

  perform net.http_post(
    url := 'https://bviluyndglsfxggqyyjb.supabase.co/functions/v1/send-kit-whatsapp',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-whatsapp-secret', v_secret,
      'apikey', 'sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6',
      'Authorization', 'Bearer sb_publishable_W9GJ5ue1gYQnIXH4NUZBfA_J5toTkt6'
    ),
    body := jsonb_build_object(
      'student_name',  v_name,
      'student_phone', v_phone,
      'student_email', v_email,
      'kit',           new.kit,
      'quantity',      new.quantity,
      'note',          coalesce(new.note, '')
    )
  );
  return new;
end;
$$;

drop trigger if exists kit_orders_whatsapp on public.kit_orders;
create trigger kit_orders_whatsapp
  after insert on public.kit_orders
  for each row execute function public.dispatch_kit_whatsapp();
