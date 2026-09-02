import { MAX_CAPACITY } from "@/lib/constants";
import { isSlotInPast } from "@/lib/date";
import type { AvailabilitySlot } from "@/types/database.types";

/** Slot enriquecido para la vista de calendario (sin datos de otras personas). */
export interface CalendarSlot {
  id: string;
  classDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  spotsLeft: number;
  notes: string | null;
  isPast: boolean;
  bookedByMe: boolean;
}

export function toCalendarSlot(
  slot: AvailabilitySlot,
  myBookedSlotIds: Set<string>,
): CalendarSlot {
  return {
    id: slot.id,
    classDate: slot.class_date,
    startTime: slot.start_time,
    endTime: slot.end_time,
    capacity: slot.capacity,
    spotsLeft: Math.max(0, Math.min(slot.capacity, MAX_CAPACITY) - slot.booked_count),
    notes: slot.notes,
    isPast: isSlotInPast(slot),
    bookedByMe: myBookedSlotIds.has(slot.id),
  };
}

export function groupByDay(slots: CalendarSlot[]): Record<string, CalendarSlot[]> {
  return slots.reduce<Record<string, CalendarSlot[]>>((acc, s) => {
    (acc[s.classDate] ??= []).push(s);
    return acc;
  }, {});
}

/** Rango [primerDía, últimoDía] del mes `year-month` (month 0‑11) como YYYY-MM-DD. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    from: `${year}-${pad(month + 1)}-01`,
    to: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

/** Parseá `?mes=YYYY-MM`; si falta o es inválido, devuelve el mes actual (TZ taller). */
export function parseMonthParam(raw: string | undefined, todayKey: string): { year: number; month: number } {
  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (month >= 0 && month <= 11 && year >= 2020 && year <= 2100) {
      return { year, month };
    }
  }
  const [y, mm] = todayKey.split("-").map(Number);
  return { year: y, month: mm - 1 };
}
