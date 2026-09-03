"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildMonthGrid, MONTH_NAMES_ES, WEEKDAY_LABELS_ES } from "@/lib/date";
import type { CalendarSlot } from "@/lib/calendar";
import { DayPanel } from "./DayPanel";

interface Props {
  year: number;
  month: number; // 0-11
  todayKey: string;
  slotsByDay: Record<string, CalendarSlot[]>;
  canBook: boolean;
  birthdaysByDay?: Record<number, string[]>;
}

function bookableCount(slots: CalendarSlot[] | undefined): number {
  return (slots ?? []).filter((s) => !s.isPast && s.spotsLeft > 0 && !s.bookedByMe).length;
}

export function CalendarView({
  year,
  month,
  todayKey,
  slotsByDay,
  canBook,
  birthdaysByDay = {},
}: Props) {
  const router = useRouter();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const [ty, tm] = todayKey.split("-").map(Number);
  const isCurrentOrPastMonth = year < ty || (year === ty && month <= tm - 1);
  const atCurrentMonth = year === ty && month === tm - 1;

  const dayNum = (dateKey: string) => Number(dateKey.slice(8, 10));
  const bdaysFor = (dateKey: string) => birthdaysByDay[dayNum(dateKey)] ?? [];

  const firstRelevantDay = useMemo(() => {
    const withSlots = grid.find(
      (c) => c.inMonth && !c.isPast && (slotsByDay[c.dateKey]?.length ?? 0) > 0,
    );
    return withSlots?.dateKey ?? grid.find((c) => c.inMonth && c.isToday)?.dateKey ?? null;
  }, [grid, slotsByDay]);

  const [selected, setSelected] = useState<string | null>(firstRelevantDay);

  function goMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    setSelected(null);
    router.push(`/calendario?mes=${y}-${m}`);
  }

  const selectedSlots = selected ? slotsByDay[selected] ?? [] : [];
  const selectedBirthdays = selected ? bdaysFor(selected) : [];

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-lino px-4 py-3">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            disabled={atCurrentMonth}
            className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft disabled:opacity-30"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <h2 className="text-sm font-semibold capitalize">
            {MONTH_NAMES_ES[month]} {year}
          </h2>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-lino p-px text-center text-[11px] font-medium text-piedra">
          {WEEKDAY_LABELS_ES.map((d) => (
            <div key={d} className="bg-crema py-1.5 capitalize">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-lino p-px">
          {grid.map((cell) => {
            const count = bookableCount(slotsByDay[cell.dateKey]);
            const mine = (slotsByDay[cell.dateKey] ?? []).some((s) => s.bookedByMe);
            const hasAnySlots = (slotsByDay[cell.dateKey]?.length ?? 0) > 0;
            const bdays = cell.inMonth ? bdaysFor(cell.dateKey) : [];
            const selectable = cell.inMonth && (hasAnySlots || bdays.length > 0);
            const isSelected = cell.dateKey === selected;

            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!selectable}
                onClick={() => setSelected(cell.dateKey)}
                aria-pressed={isSelected}
                aria-label={`${cell.day}${
                  count > 0 ? ` — ${count} horario(s) con lugar` : ""
                }${bdays.length ? ` — cumpleaños de ${bdays.join(", ")}` : ""}`}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center bg-crema text-sm transition-colors",
                  !cell.inMonth && "text-piedra-soft/50",
                  cell.inMonth && cell.isPast && "text-piedra-soft",
                  selectable && "hover:bg-miel/20",
                  isSelected && "!bg-miel/50 font-semibold",
                  cell.isToday && !isSelected && "ring-1 ring-inset ring-miel-deep",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span>{cell.day}</span>
                <span className="mt-0.5 flex items-center gap-0.5">
                  {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-ladrillo" aria-hidden />}
                  {bdays.length > 0 && <span className="text-[10px] leading-none">🎂</span>}
                </span>
                {mine && (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-piedra"
                    title="Ya reservaste este día"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-piedra">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ladrillo" /> hay lugar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-piedra" /> ya reservaste
        </span>
        <span className="flex items-center gap-1.5">🎂 cumpleaños</span>
      </div>

      {selected ? (
        <DayPanel
          dateKey={selected}
          slots={selectedSlots}
          canBook={canBook}
          birthdayNames={selectedBirthdays}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-lino px-4 py-8 text-center text-sm text-piedra">
          {isCurrentOrPastMonth
            ? "Elegí un día con clase o cumpleaños."
            : "Todavía no hay clases publicadas para este mes."}
        </p>
      )}
    </div>
  );
}
