import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { CLASS_PRICE_EUR } from "@/lib/constants";
import { MonthNav } from "@/components/admin/MonthNav";
import { StudentDot } from "@/components/admin/StudentDot";
import { resetStrikesAction } from "@/app/admin/actions";

import type { StudentOverviewRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Alumnas — un clu de bordado" };

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default async function AdminAlumnasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireAdmin();
  const { mes } = await searchParams;
  const { year, month } = parseMonthParam(mes, todayKey());
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_students_overview", { p_from: from, p_to: to });
  const rows = (data ?? []) as StudentOverviewRow[];

  const totalCobradas = rows.reduce(
    (n, s) => n + s.bookings.filter((b) => b.paid).length,
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Alumnas</h1>
        <p className="mt-1 text-sm text-piedra">
          {rows.length} registrada{rows.length === 1 ? "" : "s"}. Tocá un punto para marcar la
          clase como cobrada ({CLASS_PRICE_EUR} €) o sin cobrar.
        </p>
      </div>

      <MonthNav year={year} month={month} basePath="/admin/alumnas" />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 text-xs text-piedra">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-ladrillo" /> sin cobrar
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-green-500" /> cobrada
          </span>
        </span>
        {totalCobradas > 0 && (
          <span className="text-piedra-deep">
            {totalCobradas} cobrada{totalCobradas === 1 ? "" : "s"} ·{" "}
            {money.format(totalCobradas * CLASS_PRICE_EUR)}
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-dashed border-ladrillo/40 bg-ladrillo/5 px-4 py-8 text-center text-sm text-ladrillo-deep">
          No se pudo cargar la lista. Actualizá la página; si sigue, revisá que la base esté al
          día.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no hay alumnas registradas.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((s) => {
            const cobradas = s.bookings.filter((b) => b.paid).length;
            return (
              <li key={s.user_id} className="card p-3">
                {/* Fila 1: nombre + puntos en la misma línea */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/alumnas/${s.user_id}`}
                    className="min-w-0 flex-1 truncate font-semibold text-piedra-deep underline decoration-lino underline-offset-2 hover:decoration-ladrillo"
                  >
                    {s.full_name}
                  </Link>

                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {s.bookings.length === 0 ? (
                      <span className="text-[11px] text-piedra-soft">sin clases</span>
                    ) : (
                      s.bookings.map((b) => <StudentDot key={b.booking_id} booking={b} />)
                    )}
                  </div>
                </div>

                {/* Fila 2: resumen + estados (sólo si hay algo que decir) */}
                {(s.bookings.length > 0 || s.blocked || s.strikes > 0) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-piedra">
                    {s.bookings.length > 0 && (
                      <span>
                        {cobradas}/{s.bookings.length} cobradas
                        {cobradas > 0 && (
                          <>
                            {" · "}
                            <b className="text-piedra-deep">
                              {money.format(cobradas * CLASS_PRICE_EUR)}
                            </b>
                          </>
                        )}
                      </span>
                    )}
                    {s.blocked && (
                      <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-ladrillo-deep">
                        Bloqueada
                      </span>
                    )}
                    {s.strikes > 0 && (
                      <span className="text-ladrillo-deep">{s.strikes} sanciones</span>
                    )}
                    {(s.blocked || s.strikes > 0) && (
                      <form action={resetStrikesAction} className="inline">
                        <input type="hidden" name="userId" value={s.user_id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-lino px-2 py-0.5 font-medium text-piedra hover:bg-lino-soft"
                        >
                          Perdonar
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
