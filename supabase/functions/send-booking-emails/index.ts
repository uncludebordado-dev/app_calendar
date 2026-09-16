// =============================================================================
// Edge Function: send-booking-emails
// Disparada por un Database Webhook sobre INSERT en public.email_events.
// Tipos: booking_confirmed | booking_cancelled | user_registered
// Envía por Resend a la alumna y/o a la admin según el tipo.
// Secretos vía `supabase secrets set` — nunca en el cliente.
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "un clu de bordado <onboarding@resend.dev>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "uncludebordado@gmail.com";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://unclu-calendar.vercel.app";
const WEBHOOK_SECRET = Deno.env.get("EMAIL_WEBHOOK_SECRET") ?? "";

type EmailEvent = {
  id: string;
  type:
    | "booking_confirmed"
    | "booking_cancelled"
    | "user_registered"
    | "birthday_month"
    | "kit_reservation"
    | "monthly_report";
  payload: Record<string, unknown>;
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

  if (ev.type === "monthly_report") {
    type ChartPoint = { ym: string; label: string; income: number };
    type StudentBooking = {
      class_date: string;
      start_time: string;
      status: string;
      attended: boolean | null;
      penalty_fee: boolean;
      paid: boolean;
    };
    type StudentRow = { full_name: string; payment_exempt: boolean; bookings: StudentBooking[] };
    const r = ev.payload as {
      month_label: string;
      classes_count: number;
      reservations_count: number;
      attended_count: number;
      pending_count: number;
      new_students: number;
      active_students: number;
      income_month: number;
      income_total: number;
      chart: ChartPoint[];
      students: StudentRow[];
    };
    const eur = (n: number) =>
      new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

    // Bolita de color por reserva: amarillo = baja <24h con cargo (cobrado o
    // no, y aunque sea exenta), verde = asistió y está cobrada (o exenta),
    // rojo = confirmada pero sin cobrar todavía.
    const dotColor = (b: StudentBooking) =>
      b.penalty_fee ? "#f59e0b" : b.paid ? "#22c55e" : "#D9704A";

    const studentRows = r.students
      .map((st) => {
        const dots = st.bookings
          .map(
            (b) =>
              `<span title="${b.class_date} ${b.start_time}" style="color:${dotColor(b)};font-size:16px;letter-spacing:1px">●</span>`,
          )
          .join("");
        return `<tr>
          <td style="padding:5px 8px 5px 0;font-size:13px;color:#3D484A;border-top:1px solid #DFD7CC">
            ${escapeHtml(st.full_name)}${st.payment_exempt ? ' <span style="color:#77898B;font-size:11px">(exenta)</span>' : ""}
          </td>
          <td style="padding:5px 0;text-align:right;border-top:1px solid #DFD7CC">${dots || "—"}</td>
        </tr>`;
      })
      .join("");

    const maxIncome = Math.max(1, ...r.chart.map((c) => Number(c.income)));
    const chartRows = r.chart
      .map((c) => {
        const pct = Math.max(4, Math.round((Number(c.income) / maxIncome) * 100));
        return `<tr>
          <td style="padding:3px 8px 3px 0;font-size:12px;color:#77898B;white-space:nowrap">${c.label}</td>
          <td style="width:100%">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#D9704A;border-radius:5px;height:14px;width:${pct}%">&nbsp;</td>
              <td style="width:${100 - pct}%">&nbsp;</td>
            </tr></table>
          </td>
          <td style="padding:3px 0 3px 8px;font-size:12px;color:#3D484A;white-space:nowrap;text-align:right">${eur(Number(c.income))}</td>
        </tr>`;
      })
      .join("");

    const tile = (label: string, value: string) => `
      <td style="${BOX};width:50%" width="50%">
        <div style="font-size:11px;color:#77898B;text-transform:uppercase;letter-spacing:.03em">${label}</div>
        <div style="font-size:20px;font-weight:700;color:#3D484A;margin-top:2px">${value}</div>
      </td>`;

    const html = `<div style="${S}">
      <div style="text-align:center;margin-bottom:6px">
        <img src="${SITE_URL}/icon-512.png" width="56" height="56" alt="un clu de bordado"
             style="border-radius:14px;display:inline-block" />
      </div>
      <h1 style="${H};font-size:22px;text-align:center;margin:6px 0 0">Reporte mensual</h1>
      <p style="text-align:center;color:#3D484A;font-size:16px;font-weight:600;margin:2px 0 18px">
        ${r.month_label}
      </p>

      <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="margin:0 0 16px">
        <tr>${tile("Clases dadas", String(r.classes_count))}${tile("Alumnas nuevas", String(r.new_students))}</tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr>${tile("Clases cobradas", String(r.attended_count))}${tile("Sin cobrar", String(r.pending_count))}</tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr><td colspan="2" style="${BOX};background:#FBEBDE">
          <div style="font-size:11px;color:#A5741E;text-transform:uppercase;letter-spacing:.03em">Recaudado este mes</div>
          <div style="font-size:26px;font-weight:700;color:#B85536;margin-top:2px">${eur(r.income_month)}</div>
        </td></tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr><td colspan="2" style="${BOX}">
          <div style="font-size:11px;color:#77898B;text-transform:uppercase;letter-spacing:.03em">Total recaudado histórico</div>
          <div style="font-size:18px;font-weight:700;color:#3D484A;margin-top:2px">${eur(r.income_total)}</div>
          <div style="font-size:12px;color:#77898B;margin-top:2px">${r.active_students} alumnas activas en total</div>
        </td></tr>
      </table>

      <p style="${H};font-size:14px;margin:18px 0 6px">Ingresos, últimos 6 meses</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${chartRows}</table>

      <p style="${H};font-size:14px;margin:22px 0 6px">Alumnas del mes</p>
      <p style="font-size:11px;color:#77898B;margin:0 0 8px">
        <span style="color:#22c55e">●</span> cobrada &nbsp;
        <span style="color:#D9704A">●</span> sin cobrar &nbsp;
        <span style="color:#f59e0b">●</span> baja &lt;24h con cargo
      </p>
      ${
        studentRows
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${studentRows}</table>`
          : `<p style="color:#77898B;font-size:13px">Sin actividad registrada este mes.</p>`
      }

      <p style="color:#77898B;font-size:12px;margin-top:18px">
        Reporte automático — un clu de bordado · también lo podés ver desde el panel, en Admin → Reportes.
      </p>
    </div>`;

    return [{ to: ADMIN_EMAIL, subject: `📊 Reporte de ${r.month_label}`, html }];
  }

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
  const penalty = p.penalty_fee === true || p.penalty_fee === "true";
  return [
    {
      to: p.student_email,
      subject: penalty ? "Cancelamos tu reserva — se cobra la clase" : "Cancelamos tu reserva del clu",
      html: `<div style="${S}">
        <h2 style="${H}">Reserva cancelada</h2>
        <p>Hola ${name}, dimos de baja tu lugar para el ${when}.</p>
        ${
          penalty
            ? `<p style="${BOX}">Como la baja fue con menos de 24 horas, la clase se cobra igual (10 €).</p>`
            : late
              ? `<p style="${BOX}">Como la cancelación fue con menos de 48 horas, se registró una sanción.</p>`
              : `<p>¡Gracias por avisar con tiempo!</p>`
        }
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
          <tr><td style="padding:4px 12px 4px 0"><b>Se cobra igual</b></td><td>${penalty ? "Sí (10 €)" : "No"}</td></tr>
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
