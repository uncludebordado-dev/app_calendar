import { formatLongDate } from "@/lib/date";
import type { CalendarSlot } from "@/lib/calendar";
import { SlotCard } from "./SlotCard";

export function DayPanel({
  dateKey,
  slots,
  canBook,
}: {
  dateKey: string;
  slots: CalendarSlot[];
  canBook: boolean;
}) {
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <section aria-live="polite" className="space-y-3">
      <h3 className="text-sm font-semibold capitalize text-piedra-deep">
        {formatLongDate(dateKey)}
      </h3>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
          No hay horarios para este día.
        </p>
      ) : (
        <ul className="space-y-3">
          {sorted.map((slot) => (
            <li key={slot.id}>
              <SlotCard slot={slot} canBook={canBook} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
