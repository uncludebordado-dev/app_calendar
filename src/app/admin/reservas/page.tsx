import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayKey, formatLongDate, formatTime } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { formatPhoneForDisplay } from "@/lib/phone";
import { MonthNav } from "@/components/admin/MonthNav";
import type { AdminRosterRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Inscriptas del mes — Administración" };

export default async function AdminReservasPage({
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
  const { data } = await supabase.rpc("admin_rosters_between", { p_from: from, p_to: to });
  const rows = (data ?? []) as AdminRosterRow[];

  const bySlot = new Map<string, AdminRosterRow[]>();
  for (const r of rows) {
    if (!bySlot.has(r.slot_id)) bySlot.set(r.slot_id, []);
    bySlot.get(r.slot_id)!.push(r);
  }
  const slots = [...bySlot.values()].sort((a, b) =>
    `${a[0].class_date} ${a[0].start_time}`.localeCompare(`${b[0].class_date} ${b[0].start_time}`),
  );
  const totalInscriptas = rows.filter((r) => r.booking_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Inscriptas del mes</h1>
        <Link href="/admin/calendario" className="text-sm text-piedra underline">
          &larr; Calendario
        </Link>
      </div>

      <MonthNav year={year} month={month} basePath="/admin/reservas" />

      <p className="px-1 text-sm text-piedra">
        {slots.length} clases &middot; {totalInscriptas} reservas
      </p>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          No hay clases este mes.
        </p>
      ) : (
        slots.map((group) => {
          const head = group[0];
          const students = group.filter((r) => r.booking_id);
          return (
            <section key={head.slot_id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold capitalize text-piedra-deep">
                  {formatLongDate(head.class_date)} &middot; {formatTime(head.start_time)}&ndash;{formatTime(head.end_time)} h
                </h2>
                <span className="text-xs text-piedra">
                  {students.length}/{head.capacity}{head.is_published ? "" : " · oculta"}
                </span>
              </div>
              {head.notes && <p className="text-sm text-piedra">{head.notes}</p>}
              {students.length === 0 ? (
                <p className="text-xs text-piedra">Sin inscriptas.</p>
              ) : (
                <ul className="divide-y divide-lino text-sm">
                  {students.map((r) => (
                    <li key={r.booking_id} className="flex items-center justify-between py-2">
                      <span className="font-medium text-piedra-deep">{r.student_name}</span>
                      <a href={`tel:${r.student_phone}`} className="text-xs text-ladrillo-deep underline">
                        {r.student_phone ? formatPhoneForDisplay(r.student_phone) : "—"}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
