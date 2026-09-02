import { formatPhoneForDisplay } from "@/lib/phone";
import { isSlotInPast } from "@/lib/date";
import { markNoShowAction, adminCancelBookingAction } from "@/app/admin/actions";
import type { AdminRosterRow } from "@/types/database.types";

/** Inscriptas a UNA franja. Datos de contacto visibles sólo acá (panel admin). */
export function RosterTable({
  rows,
  slotDate,
  slotStart,
}: {
  rows: AdminRosterRow[];
  slotDate: string;
  slotStart: string;
}) {
  const students = rows.filter((r) => r.booking_id);
  const past = isSlotInPast({ class_date: slotDate, start_time: slotStart });

  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
        Todavía no hay inscriptas.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-lino text-left text-xs uppercase tracking-wide text-piedra">
            <th className="py-2 pr-3 font-semibold">Nombre</th>
            <th className="py-2 pr-3 font-semibold">Teléfono</th>
            <th className="py-2 pr-3 font-semibold">Email</th>
            <th className="py-2 pr-3 font-semibold">Estado</th>
            <th className="py-2 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {students.map((r) => (
            <tr key={r.booking_id} className="border-b border-lino/60 align-top">
              <td className="py-2.5 pr-3 font-medium text-piedra-deep">{r.student_name}</td>
              <td className="py-2.5 pr-3">
                <a href={`tel:${r.student_phone}`} className="text-ladrillo-deep underline">
                  {r.student_phone ? formatPhoneForDisplay(r.student_phone) : "—"}
                </a>
              </td>
              <td className="py-2.5 pr-3">
                <a href={`mailto:${r.student_email}`} className="text-ladrillo-deep underline">
                  {r.student_email}
                </a>
              </td>
              <td className="py-2.5 pr-3">
                {r.no_show ? (
                  <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                    Inasistencia
                  </span>
                ) : (
                  <span className="rounded-full bg-miel/30 px-2 py-0.5 text-xs text-piedra-deep">
                    Confirmada
                  </span>
                )}
              </td>
              <td className="py-2.5">
                <div className="flex justify-end gap-2">
                  {past && !r.no_show && (
                    <form action={markNoShowAction}>
                      <input type="hidden" name="bookingId" value={r.booking_id!} />
                      <button
                        type="submit"
                        className="rounded-lg border border-lino px-2.5 py-1 text-xs font-medium text-piedra hover:bg-lino-soft"
                      >
                        Marcar inasistencia
                      </button>
                    </form>
                  )}
                  {!past && (
                    <form action={adminCancelBookingAction}>
                      <input type="hidden" name="bookingId" value={r.booking_id!} />
                      <button
                        type="submit"
                        className="rounded-lg border border-ladrillo/40 px-2.5 py-1 text-xs font-medium text-ladrillo-deep hover:bg-ladrillo/10"
                      >
                        Dar de baja
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
