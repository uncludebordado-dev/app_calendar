import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Reportes mensuales — un clu de bordado" };

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

type StudentBooking = {
  class_date: string;
  start_time: string;
  penalty_fee: boolean;
  paid: boolean;
};
type StudentRow = { full_name: string; payment_exempt: boolean; bookings: StudentBooking[] };
type ReportPayload = {
  ym: string;
  month_label: string;
  classes_count: number;
  attended_count: number;
  pending_count: number;
  new_students: number;
  active_students: number;
  income_month: number;
  income_total: number;
  students: StudentRow[];
};

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] uppercase tracking-wide text-piedra">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-piedra-deep">{value}</p>
    </div>
  );
}

function dotClass(b: StudentBooking): string {
  if (b.penalty_fee) return "bg-amber-400";
  return b.paid ? "bg-green-500" : "bg-ladrillo";
}

export default async function AdminReportesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_events")
    .select("id, created_at, payload")
    .eq("type", "monthly_report")
    .order("created_at", { ascending: false });

  const reports = ((data ?? []) as { id: string; created_at: string; payload: ReportPayload }[]).map(
    (r) => r.payload,
  );

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-piedra underline">
        ← Volver al dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Reportes mensuales</h1>
        <p className="mt-1 text-sm text-piedra">
          Se genera solo, el último día de cada mes, y también llega por mail.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-dashed border-ladrillo/40 bg-ladrillo/5 px-4 py-8 text-center text-sm text-ladrillo-deep">
          No se pudieron cargar los reportes. Actualizá la página.
        </p>
      ) : reports.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no se generó ningún reporte. El primero sale al cierre de este mes.
        </p>
      ) : (
        <div className="space-y-5">
          {reports.map((r) => (
            <section key={r.ym} className="card space-y-3 p-4">
              <h2 className="text-base font-semibold capitalize text-piedra-deep">
                {r.month_label}
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <Kpi label="Clases dadas" value={String(r.classes_count)} />
                <Kpi label="Alumnas nuevas" value={String(r.new_students)} />
                <Kpi label="Cobradas" value={String(r.attended_count)} />
                <Kpi label="Sin cobrar" value={String(r.pending_count)} />
              </div>

              <div className="rounded-xl border border-lino bg-[#FBEBDE] p-3">
                <p className="text-[11px] uppercase tracking-wide text-[#A5741E]">
                  Recaudado este mes
                </p>
                <p className="mt-0.5 text-2xl font-semibold text-ladrillo-deep">
                  {money.format(r.income_month)}
                </p>
              </div>

              <div className="rounded-xl border border-lino p-3">
                <p className="text-[11px] uppercase tracking-wide text-piedra">
                  Total recaudado histórico
                </p>
                <p className="mt-0.5 text-lg font-semibold text-piedra-deep">
                  {money.format(r.income_total)}
                </p>
                <p className="text-xs text-piedra">{r.active_students} alumnas activas en total</p>
              </div>

              <div>
                <p className="mb-1.5 flex flex-wrap items-center gap-3 text-[11px] text-piedra">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> cobrada
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-ladrillo" /> sin cobrar
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> baja &lt;24h
                  </span>
                </p>
                {r.students.length === 0 ? (
                  <p className="text-xs text-piedra">Sin actividad registrada este mes.</p>
                ) : (
                  <ul className="divide-y divide-lino border-t border-lino text-sm">
                    {r.students.map((st) => (
                      <li key={st.full_name} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-piedra-deep">
                          {st.full_name}
                          {st.payment_exempt && (
                            <span className="ml-1.5 text-xs text-piedra">(exenta)</span>
                          )}
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {st.bookings.map((b, i) => (
                            <span
                              key={i}
                              title={`${b.class_date} ${b.start_time}`}
                              className={`h-2.5 w-2.5 rounded-full ${dotClass(b)}`}
                            />
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
