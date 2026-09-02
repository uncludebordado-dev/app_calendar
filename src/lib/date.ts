import { TIMEZONE } from "@/lib/constants";
import type { AvailabilitySlot } from "@/types/database.types";

type SlotTime = Pick<AvailabilitySlot, "class_date" | "start_time">;

/**
 * Offset (+HH:MM / -HH:MM) de la TZ del taller para una fecha dada.
 * Buenos Aires no tiene DST hoy, pero esto lo deja correcto si cambiara.
 */
function tzOffset(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(d);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-03:00";
  const match = name.match(/GMT([+-]\d{2}:\d{2})/);
  return match ? match[1] : "-03:00";
}

/** Instante absoluto de inicio de una franja. */
export function slotStartDate(slot: SlotTime): Date {
  return new Date(`${slot.class_date}T${slot.start_time}${tzOffset(slot.class_date)}`);
}

/** Horas (float) desde ahora hasta el inicio de la franja. Negativo si ya pasó. */
export function hoursUntilSlot(slot: SlotTime): number {
  return (slotStartDate(slot).getTime() - Date.now()) / 3_600_000;
}

export function isSlotInPast(slot: SlotTime): boolean {
  return hoursUntilSlot(slot) <= 0;
}

/** YYYY-MM-DD de "hoy" en la TZ del taller. */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

/** "sábado 6 de septiembre" */
export function formatLongDate(dateKey: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

/** "sábado 6 de septiembre de 2026, 18:00 h" */
export function formatDateTime(slot: SlotTime & { end_time?: string }): string {
  const date = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${slot.class_date}T12:00:00Z`));
  return `${date}, ${formatTime(slot.start_time)} h`;
}

/** "18:00" a partir de "18:00:00". */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

// -----------------------------------------------------------------------------
// Grilla del calendario mensual (6 semanas, empieza lunes)
// -----------------------------------------------------------------------------

export interface MonthCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const today = todayKey();
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // lunes = 0
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + i);
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    return {
      dateKey,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: dateKey === today,
      isPast: dateKey < today,
    };
  });
}

export const MONTH_NAMES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const WEEKDAY_LABELS_ES = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
