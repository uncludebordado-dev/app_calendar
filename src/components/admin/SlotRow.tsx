import Link from "next/link";
import { formatLongDate, formatTime, isSlotInPast } from "@/lib/date";
import { deleteSlotAction, togglePublishAction } from "@/app/admin/actions";
import type { AvailabilitySlot } from "@/types/database.types";

export function SlotRow({ slot }: { slot: AvailabilitySlot }) {
  const past = isSlotInPast(slot);
  const full = slot.booked_count >= slot.capacity;

  return (
    <div className={`card p-4 ${past ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize text-piedra-deep">{formatLongDate(slot.class_date)}</p>
          <p className="text-sm text-piedra">
            {formatTime(slot.start_time)}–{formatTime(slot.end_time)} h
            {slot.notes ? ` · ${slot.notes}` : ""}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 ${
                full ? "bg-ladrillo/10 text-ladrillo-deep" : "bg-miel/30 text-piedra-deep"
              }`}
            >
              {slot.booked_count}/{slot.capacity} inscriptas
            </span>
            {!slot.is_published && (
              <span className="rounded-full bg-lino-soft px-2 py-0.5 text-piedra">Oculta</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/franjas/${slot.id}`}
            className="rounded-lg border border-lino px-3 py-1.5 text-xs font-semibold text-piedra-deep hover:bg-lino-soft"
          >
            Ver inscriptas
          </Link>

          <form action={togglePublishAction}>
            <input type="hidden" name="id" value={slot.id} />
            <input type="hidden" name="next" value={String(!slot.is_published)} />
            <button
              type="submit"
              className="rounded-lg border border-lino px-3 py-1.5 text-xs font-medium text-piedra hover:bg-lino-soft"
            >
              {slot.is_published ? "Ocultar" : "Publicar"}
            </button>
          </form>

          {slot.booked_count === 0 && (
            <form action={deleteSlotAction}>
              <input type="hidden" name="id" value={slot.id} />
              <button
                type="submit"
                className="rounded-lg border border-ladrillo/40 px-3 py-1.5 text-xs font-medium text-ladrillo-deep hover:bg-ladrillo/10"
              >
                Eliminar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
