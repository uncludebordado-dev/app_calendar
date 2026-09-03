import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayKey, formatLongDate } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { MonthNav } from "@/components/admin/MonthNav";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { formatPhoneForDisplay } from "@/lib/phone";
import type {
  MonthSummaryRow,
  MonthTotals,
  UpcomingBirthday,
} from "@/types/database.types";

export const metadata = { title: "Panel — un clu de bordado" };

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-piedra">{label}</p>
      <p
        className={`mt-0.5 text-lg font-semibold ${
          tone === "accent" ? "text-ladrillo-deep" : "text-piedra-deep"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const [{ data: totalsData }, { data: summaryData }, { data: birthdaysData }] = await Promise.all([
    supabase.rpc("admin_month_totals", { p_from: from, p_to: to }),
    supabase.rpc("admin_month_summary", { p_from: from, p_to: to }),
    supabase.rpc("admin_upcoming_birthdays", { p_days: 45 }),
  ]);

  const totals = ((totalsData ?? [])[0] ?? {
    classes_count: 0,
    reservations_count: 0,
    attended_count: 0,
    noshow_count: 0,
    income_total: 0,
    active_students: 0,
  }) as MonthTotals;
  const summary = (summaryData ?? []) as MonthSummaryRow[];
  const birthdays = (birthdaysData ?? []) as UpcomingBirthday[];

  const activeRows = summary.filter(
    (r) => r.reserved_count > 0 || r.paid_total > 0 || r.payments_count > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Panel</h1>
        <div className="w-48">
          <MonthNav year={year} month={month} />
        </div>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Clases" value={String(totals.classes_count)} />
        <Kpi label="Reservas" value={String(totals.reservations_count)} />
        <Kpi label="Asistencias" value={String(totals.attended_count)} />
        <Kpi label="Inasistencias" value={String(totals.noshow_count)} />
        <Kpi label="Alumnas activas" value={String(totals.active_students)} />
        <Kpi label="Ingresos" value={money.format(totals.income_total)} tone="accent" />
      </div>

      {/* Cumpleaños */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-piedra-deep">Cumpleaños próximos (45 días)</h2>
        {birthdays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-5 text-center text-sm text-piedra">
            Nadie cumple años en las próximas semanas (o falta cargar fechas en los perfiles).
          </p>
        ) : (
          <ul className="space-y-2">
            {birthdays.map((b) => (
              <li key={b.user_id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <span className="font-semibold text-piedra-deep">{b.full_name}</span>
                  <span className="ml-2 text-piedra">cumple {b.turning_age} 🎂</span>
                </div>
                <div className="text-right">
                  <span className="block capitalize text-piedra-deep">
                    {formatLongDate(b.next_birthday)}
                  </span>
                  <span className="text-xs text-piedra">
                    {b.days_until === 0
                      ? "¡hoy!"
                      : b.days_until === 1
                        ? "mañana"
                        : `en ${b.days_until} días`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Resumen por alumna */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-piedra-deep">Resumen por alumna</h2>
          <Link href="/admin/alumnas" className="text-xs text-piedra underline">
            Ver todas →
          </Link>
        </div>

        {activeRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
            Sin actividad este mes.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeRows.map((r) => (
              <li key={r.user_id} className="card p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-piedra-deep">{r.full_name}</p>
                    <p className="text-xs text-piedra">
                      <a href={`tel:${r.phone_e164}`} className="underline">
                        {r.phone_e164 ? formatPhoneForDisplay(r.phone_e164) : "—"}
                      </a>
                    </p>
                  </div>
                  <div className="text-right text-xs text-piedra">
                    <p>
                      <b className="text-piedra-deep">{r.reserved_count}</b> reservó ·{" "}
                      <b className="text-piedra-deep">{r.attended_count}</b> asistió
                      {r.noshow_count > 0 && (
                        <>
                          {" "}
                          · <b className="text-ladrillo-deep">{r.noshow_count}</b> faltó
                        </>
                      )}
                    </p>
                    <p className="mt-0.5">
                      Pagó este mes:{" "}
                      <b className="text-piedra-deep">{money.format(r.paid_total)}</b>
                      {r.last_payment_on && (
                        <span className="text-piedra-soft"> (últ. {r.last_payment_on})</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <PaymentForm userId={r.user_id} studentName={r.full_name} compact />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
