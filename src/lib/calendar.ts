import { MAX_CAPACITY, SEASON_START_MONTH, SEASON_START_YEAR } from "@/lib/constants";
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

/** ¿(y1,m1) es anterior a (y2,m2)?  m = 0-11 */
function isBefore(y1: number, m1: number, y2: number, m2: number): boolean {
  return y1 < y2 || (y1 === y2 && m1 < m2);
}

/**
 * Parseá `?mes=YYYY-MM`; si falta o es inválido, devuelve el mes actual (TZ taller).
 * Nunca antes del inicio del sistema (septiembre 2026): se hace piso ahí.
 */
export function parseMonthParam(raw: string | undefined, todayKey: string): { year: number; month: number } {
  let year: number;
  let month: number;

  const m = raw?.match(/^(\d{4})-(\d{2})$/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 2020 && Number(m[1]) <= 2100) {
    year = Number(m[1]);
    month = Number(m[2]) - 1;
  } else {
    const [y, mm] = todayKey.split("-").map(Number);
    year = y;
    month = mm - 1;
  }

  if (isBefore(year, month, SEASON_START_YEAR, SEASON_START_MONTH)) {
    return { year: SEASON_START_YEAR, month: SEASON_START_MONTH };
  }
  return { year, month };
}

/** ¿El mes (year, month 0-11) es el primer mes del sistema? */
export function isSeasonStart(year: number, month: number): boolean {
  return year === SEASON_START_YEAR && month === SEASON_START_MONTH;
}
