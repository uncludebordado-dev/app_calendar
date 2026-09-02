// =============================================================================
// Edge Function: send-booking-emails
// Disparada por un Database Webhook sobre INSERT en public.email_events.
// Envía 2 correos vía Resend: uno a la alumna y otro a la admin.
// Ninguna clave secreta vive en el cliente: RESEND_API_KEY / secreto del webhook
// se cargan con `supabase secrets set`.
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
  type: "booking_confirmed" | "booking_cancelled";
  payload: {
    booking_id: string;
    student_name: string;
    student_email: string;
    student_phone: string;
    class_date: string;
    start_time: string;
    end_time: string;
    notes: string;
    late_cancellation: boolean;
  };
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

function formatDate(iso: string): string {
  // iso = YYYY-MM-DD -> "sábado 6 de septiembre de 2026"
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function studentEmail(ev: EmailEvent) {
  const p = ev.payload;
  const when = `${formatDate(p.class_date)}, de ${p.start_time} a ${p.end_time} h`;
  if (ev.type === "booking_confirmed") {
    return {
      subject: "Tu lugar en el clu está reservado ✿",
      html: `
        <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#566567;max-width:520px;margin:auto">
          <h2 style="color:#D9704A;font-weight:600">¡Reserva confirmada!</h2>
          <p>Hola ${escapeHtml(p.student_name)}, te esperamos en el taller de bordado.</p>
          <table style="border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:4px 12px 4px 0"><b>Día</b></td><td>${when}</td></tr>
            ${p.notes ? `<tr><td style="padding:4px 12px 4px 0"><b>Tema</b></td><td>${escapeHtml(p.notes)}</td></tr>` : ""}
          </table>
          <p style="background:#FBF8F3;border:1px solid #DFD7CC;border-radius:12px;padding:12px 16px">
            Si no vas a poder venir, avisá la baja desde la app con al menos
            <b>48 horas</b> de anticipación para liberar el lugar y no sumar una sanción.
          </p>
          <p style="color:#77898B;font-size:13px">un clu de bordado — reuniones, hilo y comunidad.</p>
        </div>`,
    };
  }
  return {
    subject: "Cancelamos tu reserva del clu",
    html: `
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#566567;max-width:520px;margin:auto">
        <h2 style="color:#D9704A;font-weight:600">Reserva cancelada</h2>
        <p>Hola ${escapeHtml(p.student_name)}, dimos de baja tu lugar para el ${when}.</p>
        ${
          p.late_cancellation
            ? `<p style="background:#FBF8F3;border:1px solid #DFD7CC;border-radius:12px;padding:12px 16px">
                 Como la cancelación fue con menos de 48 horas, se registró una sanción en tu cuenta.
               </p>`
            : `<p>¡Gracias por avisar con tiempo! Esperamos verte en otra clase.</p>`
        }
      </div>`,
  };
}

function adminEmail(ev: EmailEvent) {
  const p = ev.payload;
  const when = `${formatDate(p.class_date)} · ${p.start_time}–${p.end_time} h`;
  const isNew = ev.type === "booking_confirmed";
  return {
    subject: `${isNew ? "Nueva reserva" : "Baja de reserva"} — ${p.student_name} (${when})`,
    html: `
      <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#566567;max-width:560px;margin:auto">
        <h2 style="color:#D9704A;font-weight:600">${isNew ? "Nueva reserva" : "Se canceló una reserva"}</h2>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:4px 12px 4px 0"><b>Alumna</b></td><td>${escapeHtml(p.student_name)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Teléfono</b></td><td>${escapeHtml(p.student_phone)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Email</b></td><td>${escapeHtml(p.student_email)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0"><b>Clase</b></td><td>${when}</td></tr>
          ${p.notes ? `<tr><td style="padding:4px 12px 4px 0"><b>Tema</b></td><td>${escapeHtml(p.notes)}</td></tr>` : ""}
          ${!isNew ? `<tr><td style="padding:4px 12px 4px 0"><b>Cancelación tardía</b></td><td>${p.late_cancellation ? "Sí (–48h, con sanción)" : "No"}</td></tr>` : ""}
        </table>
      </div>`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

async function sendResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Autenticación del webhook (header configurado en el Database Webhook).
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { record?: EmailEvent; type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const event = body.record;
  if (!event?.id) {
    return new Response("No record", { status: 400 });
  }

  try {
    const forStudent = studentEmail(event);
    const forAdmin = adminEmail(event);

    await sendResend(event.payload.student_email, forStudent.subject, forStudent.html);
    await sendResend(ADMIN_EMAIL, forAdmin.subject, forAdmin.html);

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
