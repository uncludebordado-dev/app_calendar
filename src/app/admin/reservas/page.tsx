import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayKey, formatLongDate, formatTime } from "@/lib/date";
import { RosterTable } from "@/components/admin/RosterTable";
import { Alert } from "@/components/ui/Alert";
import type { AdminRosterRow } from "@/types/database.types";

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const from = todayKey();
  const to = addDays(from, 90);

  const { data } = await supabase.rpc("admin_rosters_between", { p_from: from, p_to: to });
  const rows = (data ?? []) as AdminRosterRow[];

  // Agrupar por franja.
  const bySlot = new Map<string, AdminRosterRow[]>();
  for (const r of rows) {
    if (!bySlot.has(r.slot_id)) bySlot.set(r.slot_id, []);
    bySlot.get(r.slot_id)!.push(r);
  }
  const slots = [...bySlot.values()].sort((a, b) => {
    const ka = `${a[0].class_date} ${a[0].start_time}`;
    const kb = `${b[0].class_date} ${b[0].start_time}`;
    return ka.localeCompare(kb);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Inscriptas por clase</h1>
          <p className="mt-1 text-sm text-piedra">Próximos 90 días. Datos de contacto visibles sólo acá.</p>
        </div>
        <Link href="/admin" className="text-sm text-piedra underline">
          ← Franjas
        </Link>
      </div>

      {error && <Alert tone="error">{decodeURIComponent(error)}</Alert>}

      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          No hay clases en el rango.
        </p>
      ) : (
        slots.map((group) => {
          const head = group[0];
          const count = group.filter((r) => r.booking_id).length;
          return (
            <section key={head.slot_id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold capitalize text-piedra-deep">
                  {formatLongDate(head.class_date)} · {formatTime(head.start_time)}–
                  {formatTime(head.end_time)} h
                </h2>
                <span className="text-xs text-piedra">
                  {count}/{head.capacity} lugares{head.is_published ? "" : " · oculta"}
                </span>
              </div>
              {head.notes && <p className="text-sm text-piedra">{head.notes}</p>}
              <RosterTable rows={group} slotDate={head.class_date} slotStart={head.start_time} />
            </section>
          );
        })
      )}
    </div>
  );
}
