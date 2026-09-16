-- =============================================================================
-- Conectar el aviso de WhatsApp por cada kit reservado (después de correr
-- APLICAR_AHORA.sql).
--
-- Pasos, EN ESTE ORDEN:
--   1) Crear una cuenta gratis en https://www.twilio.com/try-twilio
--   2) Consola de Twilio → Messaging → Try it out → Send a WhatsApp message
--      → seguí las instrucciones para "unirte" al sandbox desde TU WhatsApp
--      normal (le mandás un mensaje tipo "join palabra-clave" al número que
--      te muestra la pantalla). Sin esto, Twilio no te puede escribir.
--   3) Copiá de la consola de Twilio: Account SID y Auth Token.
--   4) Supabase → Edge Functions → Deploy a new function → nombre exacto:
--      send-kit-whatsapp. Pegá el contenido de
--      supabase/functions/send-kit-whatsapp/index.ts
--   5) Esa función → Secrets, cargá:
--        TWILIO_ACCOUNT_SID   = (el de Twilio)
--        TWILIO_AUTH_TOKEN    = (el de Twilio)
--        TWILIO_WHATSAPP_FROM = whatsapp:+14155238886   (el número sandbox que te dio Twilio)
--        ADMIN_WHATSAPP_TO    = whatsapp:+34699291565   (tu WhatsApp normal, con "whatsapp:" adelante)
--        KIT_WHATSAPP_SECRET  = (el mismo valor que pegues abajo)
--   6) Pegá ACÁ el mismo valor de KIT_WHATSAPP_SECRET y corré sólo este bloque
--      en el SQL Editor. NO subas este archivo a git con el valor real adentro.
-- =============================================================================

insert into private.app_secrets (key, value)
values ('kit_whatsapp_secret', 'PEGÁ_ACÁ_TU_KIT_WHATSAPP_SECRET_Y_NO_LO_COMMITEES')
on conflict (key) do update set value = excluded.value, updated_at = now();
