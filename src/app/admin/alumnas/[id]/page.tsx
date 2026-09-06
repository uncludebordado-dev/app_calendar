import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatLongDate } from "@/lib/date";
import { Avatar } from "@/components/ui/Avatar";
import type { StudentDetail } from "@/types/database.types";

export const metadata: Metadata = { title: "Ficha de alumna — un clu de bordado" };

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "MercadoPago",
  otro: "Otro",
};

function birthdayLabel(iso: string | null): string {
  if (!iso) return "sin cargar";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export default async function AlumnaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_student_detail", { p_user_id: id });
  const detail = ((data ?? [])[0] ?? null) as StudentDetail | null;
  if (!detail) notFound();

  const year = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <Link href="/admin/alumnas" className="text-sm text-piedra underline">
        ← Volver a Alumnas
      </Link>

      <div className="flex items-start gap-3">
        <Avatar src={detail.avatar_url} name={detail.full_name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-piedra-deep">
            <span className="break-words">{detail.full_name}</span>
            {detail.blocked && (
              <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                Bloqueada
              </span>
            )}
            {detail.strikes > 0 && (
              <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                {detail.strikes} sanciones
              </span>
            )}
          </h1>
          <p className="mt-1 break-words text-xs text-piedra">
            <a href={`tel:${detail.phone_e164}`} className="text-ladrillo-deep underline">
              {detail.phone_e164 ? formatPhoneForDisplay(detail.phone_e164) : "sin teléfono"}
            </a>
            <span className="mx-1 text-piedra-soft">·</span>
            <a href={`mailto:${detail.email}`} className="break-all text-ladrillo-deep underline">
              {detail.email}
            </a>
          </p>
        </div>
      </div>

      <dl className="card grid grid-cols-2 gap-x-3 gap-y-2 p-3 text-xs">
        <div>
          <dt className="text-piedra-soft">Cumpleaños</dt>
          <dd className="font-semibold text-piedra-deep">{birthdayLabel(detail.birth_date)}</dd>
        </div>
        <div>
          <dt className="text-piedra-soft">Empezó en el club</dt>
          <dd className="font-semibold text-piedra-deep first-letter:uppercase">
            {formatLongDate(detail.registered_on)}
          </dd>
        </div>
      </dl>

      {/* Total pagado */}
      <section className="card p-4">
        <p className="text-xs text-piedra">Pagado en total desde que empezó</p>
        <p className="mt-0.5 text-2xl font-semibold text-ladrillo-deep">
          {money.format(detail.total_paid ?? 0)}
        </p>
        <p className="text-xs text-piedra">
          {detail.payments_count} pago{detail.payments_count === 1 ? "" : "s"} registrado
          {detail.payments_count === 1 ? "" : "s"}
        </p>

        {detail.payments.length > 0 && (
          <ul className="mt-3 divide-y divide-lino border-t border-lino text-sm">
            {detail.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-piedra">
                  {p.paid_on}
                  <span className="mx-1 text-piedra-soft">·</span>
                  {METHOD_LABEL[p.method] ?? p.method}
                  {p.note && <span className="block text-xs text-piedra-soft">{p.note}</span>}
                </span>
                <span className="font-semibold text-piedra-deep">
                  {p.amount != null ? money.format(p.amount) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Asistencias del año */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-piedra-deep">
          Asistencias {year} · {detail.attended.length}
        </h2>
        {detail.attended.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
            Todavía no tiene asistencias marcadas este año.
          </p>
        ) : (
          <ul className="card divide-y divide-lino p-0 text-sm">
            {detail.attended.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-piedra-deep first-letter:uppercase">{dayLabel(a.class_date)}</span>
                <span className="text-piedra">
                  {a.start_time}–{a.end_time}
                  {a.notes && <span className="text-piedra-soft"> · {a.notes}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
