// =============================================================================
// Edge Function: send-kit-whatsapp
// Disparada por el trigger dispatch_kit_whatsapp() cuando alguien reserva un
// kit. Manda un WhatsApp a la admin vía Twilio (API de WhatsApp).
// Secretos: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
// ADMIN_WHATSAPP_TO, KIT_WHATSAPP_SECRET.
// =============================================================================

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
// Formato: "whatsapp:+14155238886" (el número sandbox de Twilio, o tu remitente propio)
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "";
// Formato: "whatsapp:+34699291565" (tu WhatsApp normal, el que recibe el aviso)
const ADMIN_WHATSAPP_TO = Deno.env.get("ADMIN_WHATSAPP_TO") ?? "";
const WHATSAPP_SECRET = Deno.env.get("KIT_WHATSAPP_SECRET") ?? "";

const KIT_NAMES: Record<string, string> = {
  basico: "Kit Básico",
  medium: "Kit Medium",
  pro: "Kit Pro",
};

type Body = {
  student_name?: string;
  student_phone?: string;
  student_email?: string;
  kit?: string;
  quantity?: number;
  note?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (WHATSAPP_SECRET && req.headers.get("x-whatsapp-secret") !== WHATSAPP_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM || !ADMIN_WHATSAPP_TO) {
    return new Response(
      JSON.stringify({ ok: false, error: "Twilio no está configurado todavía" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const kitName = KIT_NAMES[body.kit ?? ""] ?? body.kit ?? "kit";
  const lines = [
    "📦 *Nuevo pedido de kit*",
    "",
    `Nombre: ${body.student_name ?? "—"}`,
    `Teléfono: ${body.student_phone ?? "—"}`,
    `Email: ${body.student_email ?? "—"}`,
    `Kit: ${kitName} × ${body.quantity ?? 1}`,
  ];
  if (body.note) lines.push(`Nota: ${body.note}`);
  const text = lines.join("\n");

  const form = new URLSearchParams({
    From: TWILIO_WHATSAPP_FROM,
    To: ADMIN_WHATSAPP_TO,
    Body: text,
  });

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    return new Response(JSON.stringify({ ok: false, error: errText }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
