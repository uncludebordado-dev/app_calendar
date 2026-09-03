// =============================================================================
// Edge Function: send-booking-emails
// Disparada por un Database Webhook sobre INSERT en public.email_events.
// Tipos: booking_confirmed | booking_cancelled | user_registered
// Envía por Resend a la alumna y/o a la admin según el tipo.
// Secretos vía `supabase secrets set` — nunca en el cliente.
// =============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "un clu de bordado <onboarding@resend.dev>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "uncludebordado@gmail.com";
const WEBHOOK_SECRET = Deno.env.get("EMAIL_WEBHOOK_SECRET") ?? "";

type EmailEvent = {
  id: string;
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "user_registered"
    | "birthday_month"
    | "kit_reservation";
  payload: Record<string, string | boolean | number>;
};

const KIT_NAMES: Record<string, string> = {
  basico: "Kit Básico",
  medium: "Kit Medium",
  pro: "Kit Pro",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const S = "font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#566567;max-width:520px;margin:auto";
const H = "color:#D9704A;font-weight:600";
const BOX = "background:#FBF8F3;border:1px solid #DFD7CC;border-radius:12px;padding:12px 16px";

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function longDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Devuelve la lista de correos a enviar para este evento. */
function buildEmails(ev: EmailEvent): { to: string; subject: string; html: string }[] {
  const p = ev.payload as Record<string, string>;
  const name = escapeHtml(p.student_name ?? "");

  if (ev.type === "birthday_month") {
    const label = String(p.month_label ?? "");
    const bodyFor = (who: "student" | "admin") => `<div style="${S}">
      <h2 style="${H}">🎂 ¡Cumpleaños del mes!</h2>
      <p>${
        who === "student"
          ? `Este mes es tu cumpleaños, ${name}. ¡Feliz mes de parte de todo el clu de bordado!`
          : `Este mes cumple años <b>${name}</b>. Buen momento para un detalle o una actividad especial.`
      }</p>
      <p style="color:#77898B;font-size:13px">Aviso automático — ${label}</p>
    </div>`;
    return [
      { to: p.student_email, subject: "🎂 ¡Este mes es tu cumpleaños!", html: bodyFor("student") },
      { to: ADMIN_EMAIL, subject: `🎂 Este mes cumple años ${p.student_name}`, html: bodyFor("admin") },
    ];
  }

  if (ev.type === "kit_reservation") {
    const kitName = KIT_NAMES[String(p.kit)] ?? String(p.kit);
    return [
      {
        to: ADMIN_EMAIL,
        subject: `Reserva de kit — ${p.student_name} (${kitName} x${p.quantity})`,
        html: `<div style="${S}">
          <h2 style="${H}">Nueva reserva de kit</h2>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0"><b>Alumna</b></td><td>${name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Teléfono</b></td><td>${escapeHtml(String(p.student_phone ?? ""))}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(String(p.student_email ?? ""))}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Kit</b></td><td>${kitName} × ${p.quantity}</td></tr>
            ${p.note ? `<tr><td style="padding:4px 12px 4px 0"><b>Nota</b></td><td>${escapeHtml(String(p.note))}</td></tr>` : ""}
          </table>
          <p style="${BOX}">Contactá a la alumna para coordinar la entrega y el pago en persona.</p>
        </div>`,
      },
      {
        to: p.student_email,
        subject: "Recibimos tu reserva de kit ✿",
        html: `<div style="${S}">
          <h2 style="${H}">¡Reserva anotada!</h2>
          <p>Hola ${name}, reservaste <b>${kitName} × ${p.quantity}</b>. La profe te va a
          escribir para coordinar la entrega. El pago se hace en persona.</p>
        </div>`,
      },
    ];
  }

  if (ev.type === "user_registered") {
    return [
      {
        to: ADMIN_EMAIL,
        subject: `Nueva alumna registrada — ${p.student_name}`,
        html: `<div style="${S}">
          <h2 style="${H}">Nueva alumna en el clu</h2>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0"><b>Nombre</b></td><td>${name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Teléfono</b></td><td>${escapeHtml(p.student_phone ?? "")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(p.student_email ?? "")}</td></tr>
            ${p.birth_date ? `<tr><td style="padding:4px 12px 4px 0"><b>Cumpleaños</b></td><td>${longDate(p.birth_date)}</td></tr>` : ""}
          </table>
        </div>`,
      },
      {
        to: p.student_email,
        subject: "¡Bienvenida al clu de bordado! ✿",
        html: `<div style="${S}">
          <h2 style="${H}">¡Tu cuenta está lista, ${name}!</h2>
          <p>Ya podés entrar a la app y reservar tu lugar en la próxima clase.</p>
          <p style="${BOX}">Recordá avisar cualquier baja con <b>48 horas</b> de anticipación
          para liberar el lugar y no sumar una sanción.</p>
          <p style="color:#77898B;font-size:13px">un clu de bordado — reuniones, hilo y comunidad.</p>
        </div>`,
      },
    ];
  }

  const when = `${longDate(p.class_date)}, de ${p.start_time} a ${p.end_time} h`;

  if (ev.type === "booking_confirmed") {
    return [
      {
        to: p.student_email,
        subject: "Tu lugar en el clu está reservado ✿",
        html: `<div style="${S}">
          <h2 style="${H}">¡Reserva confirmada!</h2>
          <p>Hola ${name}, te esperamos en el taller de bordado.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 12px 4px 0"><b>Día</b></td><td>${when}</td></tr>
            ${p.notes ? `<tr><td style="padding:4px 12px 4px 0"><b>Tema</b></td><td>${escapeHtml(p.notes)}</td></tr>` : ""}
          </table>
          <p style="${BOX}">Si no vas a poder venir, avisá la baja desde la app con al menos
          <b>48 horas</b> de anticipación.</p>
        </div>`,
      },
      {
        to: ADMIN_EMAIL,
        subject: `Nueva reserva — ${p.student_name} (${longDate(p.class_date)} ${p.start_time})`,
        html: `<div style="${S}">
          <h2 style="${H}">Nueva reserva</h2>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0"><b>Alumna</b></td><td>${name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Teléfono</b></td><td>${escapeHtml(p.student_phone ?? "")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(p.student_email ?? "")}</td></tr>
            <tr><td style="padding:4px 12px 4px 0"><b>Clase</b></td><td>${when}</td></tr>
          </table>
        </div>`,
      },
    ];
  }

  // booking_cancelled
  const late = p.late_cancellation === true || p.late_cancellation === "true";
  return [
    {
      to: p.student_email,
      subject: "Cancelamos tu reserva del clu",
      html: `<div style="${S}">
        <h2 style="${H}">Reserva cancelada</h2>
        <p>Hola ${name}, dimos de baja tu lugar para el ${when}.</p>
        ${late ? `<p style="${BOX}">Como la cancelación fue con menos de 48 horas, se registró una sanción.</p>` : `<p>¡Gracias por avisar con tiempo!</p>`}
      </div>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Baja de reserva — ${p.student_name} (${longDate(p.class_date)} ${p.start_time})`,
      html: `<div style="${S}">
        <h2 style="${H}">Se canceló una reserva</h2>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:4px 12px 4px 0"><b>Alumna</b></td><td>${name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Teléfono</b></td><td>${escapeHtml(p.student_phone ?? "")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Clase</b></td><td>${when}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Tardía</b></td><td>${late ? "Sí (con sanción)" : "No"}</td></tr>
        </table>
      </div>`,
    },
  ];
}

async function sendResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { record?: EmailEvent };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const event = body.record;
  if (!event?.id) return new Response("No record", { status: 400 });

  try {
    for (const mail of buildEmails(event)) {
      if (mail.to) await sendResend(mail.to, mail.subject, mail.html);
    }
    await admin
      .from("email_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin.from("email_events").update({ error: message }).eq("id", event.id);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
