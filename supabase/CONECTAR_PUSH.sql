-- =============================================================================
-- Conectar las notificaciones push de News (después de correr APLICAR_AHORA.sql).
--
-- Pasos, EN ESTE ORDEN:
--   1) Supabase → Edge Functions → Deploy a new function → nombre exacto:
--      send-news-push. Pegá el contenido de
--      supabase/functions/send-news-push/index.ts
--   2) Esa función > Secrets, cargá:
--        VAPID_PUBLIC_KEY   = BORByZfIanqOOJXXnJ-L5QuMZoPXtoCwTHmgAOyzbneWVcfTrYg-UrCEvwFjfE60JbZ3CQKOcU3pFaVZTB8d5_s
--        VAPID_PRIVATE_KEY  = (te la paso aparte, es secreta — no va acá)
--        VAPID_SUBJECT      = mailto:uncludebordado@gmail.com
--        PUSH_WEBHOOK_SECRET = (el mismo valor que pegues abajo)
--   3) Pegá ACÁ el mismo valor de PUSH_WEBHOOK_SECRET y corré sólo este bloque
--      en el SQL Editor. NO subas este archivo a git con el valor real adentro.
-- =============================================================================

insert into private.app_secrets (key, value)
values ('news_push_secret', 'PEGÁ_ACÁ_TU_PUSH_WEBHOOK_SECRET_Y_NO_LO_COMMITEES')
on conflict (key) do update set value = excluded.value, updated_at = now();
