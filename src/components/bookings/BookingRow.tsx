import { formatLongDate, formatTime, hoursUntilSlot } from "@/lib/date";
import { FREE_CANCEL_HOURS } from "@/lib/constants";
import type { AvailabilitySlot, Booking } from "@/types/database.types";
import { CancelButton } from "./CancelButton";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function BookingRow({
  booking,
  slot,
  kind,
}: {
  booking: Booking;
  slot: AvailabilitySlot | null;
  kind: "upcoming" | "past";
}) {
  const cancelled = booking.status === "cancelled";
  const hoursLeft = slot ? hoursUntilSlot(slot) : -1;
  const withinFreeWindow = hoursLeft >= FREE_CANCEL_HOURS;

  return (
    <div className={`card p-4 ${cancelled ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Día y fecha */}
          <p className="font-semibold text-piedra-deep">
            {slot ? capitalize(formatLongDate(slot.class_date)) : "Clase eliminada"}
          </p>

          {/* Horario de inicio y fin · nombre de la clase */}
          {slot && (
            <p className="mt-0.5 text-sm text-piedra">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              {slot.notes ? <span className="text-piedra-deep"> · {slot.notes}</span> : null}
            </p>
          )}

          {/* Etiqueta de estado */}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {cancelled ? (
              <span className="rounded-full bg-lino-soft px-2.5 py-0.5 font-medium text-piedra">
                Cancelada
              </span>
            ) : (
              <span className="rounded-full bg-miel/30 px-2.5 py-0.5 font-medium text-piedra-deep">
                Confirmada
              </span>
            )}
            {booking.late_cancellation && (
              <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-ladrillo-deep">
                Cancelación tardía · sanción
              </span>
            )}
            {booking.no_show && (
              <span className="rounded-full bg-ladrillo/10 px-2 py-0.5 text-ladrillo-deep">
                Inasistencia · sanción
              </span>
            )}
          </div>
        </div>

        {kind === "upcoming" && !cancelled && slot && (
          <div className="shrink-0">
            <CancelButton bookingId={booking.id} withinFreeWindow={withinFreeWindow} />
          </div>
        )}
      </div>
    </div>
  );
}
