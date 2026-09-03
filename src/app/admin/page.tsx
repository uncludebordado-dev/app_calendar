import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayKey, formatLongDate } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { MonthNav } from "@/components/admin/MonthNav";
import { BarChart } from "@/components/admin/BarChart";
import type { MonthTotals, StudentsByMonthRow, UpcomingBirthday } from "@/types/database.types";

export const metadata = { title: "Dashboard — un clu de bordado" };

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-piedra">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold ${accent ? "text-ladrillo-deep" : "text-piedra-deep"}`}>
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
  await requireAdmin();
  const { mes } = await searchParams;
  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const [{ data: totalsData }, { data: byMonth }, { data: bdays }] = await Promise.all([
    supabase.rpc("admin_month_totals", { p_from: from, p_to: to }),
    supabase.rpc("admin_students_by_month", { p_months: 12 }),
    supabase.rpc("admin_upcoming_birthdays", { p_days: 45 }),
  ]);

  const t = ((totalsData ?? [])[0] ?? {
    classes_count: 0, reservations_count: 0, attended_count: 0, noshow_count: 0,
    income_total: 0, active_students: 0, new_students: 0,
  }) as MonthTotals;
  const chart = ((byMonth ?? []) as StudentsByMonthRow[]).map((r) => ({ ym: r.ym, value: r.cumulative }));
  const birthdays = (bdays ?? []) as UpcomingBirthday[];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      <MonthNav year={year} month={month} basePath="/admin" />

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Asistencias" value={String(t.attended_count)} />
        <Kpi label="Inasistencias" value={String(t.noshow_count)} />
        <Kpi label="Clases dadas" value={String(t.classes_count)} />
        <Kpi label="Alumnas nuevas" value={String(t.new_students)} />
        <div className="col-span-2">
          <Kpi label="Dinero recaudado" value={money.format(t.income_total)} accent />
        </div>
      </div>

      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold text-piedra-deep">Total de alumnas por mes</h2>
        <p className="mb-3 text-xs text-piedra">Acumulado de alumnas registradas al cierre de cada mes.</p>
        <BarChart data={chart} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-piedra-deep">Cumpleaños próximos (45 días)</h2>
        {birthdays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-5 text-center text-sm text-piedra">
            Nadie cumple años pronto (o falta cargar fechas en los perfiles).
          </p>
        ) : (
          <ul className="space-y-2">
            {birthdays.map((b) => (
              <li key={b.user_id} className="card flex items-center justify-between p-3 text-sm">
                <span className="font-semibold text-piedra-deep">{b.full_name}</span>
                <span className="text-right text-piedra">
                  <span className="block capitalize">🎂 {formatLongDate(b.next_birthday)}</span>
                  <span className="text-xs">
                    {b.days_until === 0 ? "¡hoy!" : b.days_until === 1 ? "mañana" : `en ${b.days_until} días`} · cumple {b.turning_age}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
