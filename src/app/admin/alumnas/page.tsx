import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { formatPhoneForDisplay } from "@/lib/phone";
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
  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_students_overview", { p_from: from, p_to: to });
  const rows = (data ?? []) as StudentOverviewRow[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Alumnas</h1>
        <p className="mt-1 text-sm text-piedra">
          {rows.length} registradas. Cada punto es una reserva del mes: tocalo para marcar
          asistencia y pago.
        </p>
      </div>

      <MonthNav year={year} month={month} basePath="/admin/alumnas" />

      <p className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-piedra">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-ladrillo" /> pendiente / no pagó</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-400" /> pagó</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-500" /> asistió y pagó</span>
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no hay alumnas registradas.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => {
            const paidTotal = s.bookings.reduce((n, b) => n + (b.paid ? b.amount ?? 0 : 0), 0);
            return (
              <li key={s.user_id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-piedra-deep">
                      {s.full_name}
                      {s.blocked && (
                        <span className="ml-2 rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                          Bloqueada
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <a href={`tel:${s.phone_e164}`} className="text-ladrillo-deep underline">
                        {s.phone_e164 ? formatPhoneForDisplay(s.phone_e164) : "—"}
                      </a>
                      <span className="mx-1 text-piedra-soft">·</span>
                      <a href={`mailto:${s.email}`} className="text-ladrillo-deep underline">
                        {s.email}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-piedra">
                      Registrada el {s.registered_on}
                      {s.strikes > 0 && (
                        <> · <b className="text-ladrillo-deep">{s.strikes} sanciones</b></>
                      )}
                    </p>
                  </div>

                  {(s.strikes > 0 || s.blocked) && (
                    <form action={resetStrikesAction}>
                      <input type="hidden" name="userId" value={s.user_id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-lino px-2.5 py-1 text-xs font-medium text-piedra hover:bg-lino-soft"
                      >
                        Perdonar
                      </button>
                    </form>
                  )}
                </div>

                <div className="mt-3 border-t border-lino pt-3">
                  {s.bookings.length === 0 ? (
                    <p className="text-xs text-piedra">Sin reservas este mes.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {s.bookings.map((b) => (
                          <StudentDot key={b.booking_id} booking={b} />
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-piedra">
                        {s.bookings.length} reserva{s.bookings.length === 1 ? "" : "s"} ·{" "}
                        pagó <b className="text-piedra-deep">{money.format(paidTotal)}</b> este mes
                      </p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
