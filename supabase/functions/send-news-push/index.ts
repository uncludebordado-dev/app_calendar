// =============================================================================
// Edge Function: send-news-push
// Disparada por el trigger dispatch_news_push() cuando se publica una News.
// Manda una notificación push (Web Push / VAPID) a todas las suscripciones.
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_WEBHOOK_SECRET.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:uncludebordado@gmail.com";
const PUSH_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type Body = { post_id?: number; title?: string; body?: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (PUSH_SECRET && req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response("VAPID no configurado", { status: 500 });
  }

  let payload: Body;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  const message = JSON.stringify({
    title: `📣 ${payload.title ?? "Nueva noticia"}`,
    body: (payload.body ?? "").slice(0, 140),
    url: "/news",
  });

  let sent = 0;
  const toRemove: string[] = [];

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
        );
        sent++;
      } catch (err) {
        // 404/410 = la suscripción ya no existe (usuaria desinstaló, etc.)
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) toRemove.push(s.endpoint);
      }
    }),
  );

  if (toRemove.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", toRemove);
  }

  return new Response(JSON.stringify({ ok: true, sent, removed: toRemove.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
