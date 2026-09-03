"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildMonthGrid, MONTH_NAMES_ES, WEEKDAY_LABELS_ES, formatLongDate } from "@/lib/date";
import { createSlotAction, type AdminActionResult } from "@/app/admin/actions";
import { Alert } from "@/components/ui/Alert";
import { MAX_CAPACITY } from "@/lib/constants";

export interface AdminSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  notes: string | null;
  isPublished: boolean;
}

const initial: AdminActionResult = { ok: false };

export function AdminCalendar({
  year,
  month,
  slotsByDay,
  birthdaysByDay,
}: {
  year: number;
  month: number;
  slotsByDay: Record<string, AdminSlot[]>;
  birthdaysByDay: Record<number, string[]>;
}) {
  const router = useRouter();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const firstWithClasses = grid.find((c) => c.inMonth && (slotsByDay[c.dateKey]?.length ?? 0) > 0);
  const [selected, setSelected] = useState<string>(
    firstWithClasses?.dateKey ?? grid.find((c) => c.inMonth && c.isToday)?.dateKey ?? `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
  const [state, formAction, pending] = useActionState(createSlotAction, initial);
  const [showForm, setShowForm] = useState(false);

  function goMonth(delta: number) {
    const d = new Date(Date.UTC(year, month + delta, 1));
    router.push(`/admin/calendario?mes=${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
    setShowForm(false);
  }

  const daySlots = (slotsByDay[selected] ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-lino px-4 py-3">
          <button type="button" onClick={() => goMonth(-1)} className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft" aria-label="Mes anterior">←</button>
          <h2 className="text-sm font-semibold capitalize">{MONTH_NAMES_ES[month]} {year}</h2>
          <button type="button" onClick={() => goMonth(1)} className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft" aria-label="Mes siguiente">→</button>
        </div>

        <div className="grid grid-cols-7 gap-px bg-lino p-px text-center text-[11px] font-medium text-piedra">
          {WEEKDAY_LABELS_ES.map((d) => (
            <div key={d} className="bg-crema py-1.5 capitalize">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-lino p-px">
          {grid.map((cell) => {
            const count = slotsByDay[cell.dateKey]?.length ?? 0;
            const bdays = cell.inMonth ? birthdaysByDay[cell.day] ?? [] : [];
            const isSel = cell.dateKey === selected;
            return (
              <button
                key={cell.dateKey}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => { setSelected(cell.dateKey); setShowForm(false); }}
                aria-pressed={isSel}
                className={[
                  "relative flex aspect-square flex-col items-center justify-center bg-crema text-sm transition-colors",
                  !cell.inMonth && "text-piedra-soft/40",
                  cell.inMonth && "hover:bg-miel/20",
                  isSel && "!bg-miel/50 font-semibold",
                  cell.isToday && !isSel && "ring-1 ring-inset ring-miel-deep",
                ].filter(Boolean).join(" ")}
              >
                <span>{cell.day}</span>
                <span className="mt-0.5 flex items-center gap-0.5">
                  {count > 0 && <span className="rounded bg-ladrillo px-1 text-[9px] font-semibold text-white">{count}</span>}
                  {bdays.length > 0 && <span title={bdays.join(", ")}>🎂</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-xs text-piedra">
        <span className="rounded bg-ladrillo px-1 text-[9px] font-semibold text-white">N</span> clases del día ·{" "}
        🎂 cumpleaños · <Link href="/admin/horarios" className="underline">ver lista completa</Link>
      </p>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Clase agregada.</Alert>}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold capitalize text-piedra-deep">{formatLongDate(selected)}</h3>

        {(birthdaysByDay[Number(selected.slice(-2))] ?? []).length > 0 && (
          <p className="rounded-xl bg-miel/20 px-3 py-2 text-sm text-piedra-deep">
            🎂 Cumple: {birthdaysByDay[Number(selected.slice(-2))].join(", ")}
          </p>
        )}

        {daySlots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
            Sin clases este día.
          </p>
        ) : (
          <ul className="space-y-2">
            {daySlots.map((s) => (
              <li key={s.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-semibold text-piedra-deep">{s.startTime}–{s.endTime} h</p>
                  <p className="text-xs text-piedra">
                    {s.bookedCount}/{s.capacity} inscriptas{s.notes ? ` · ${s.notes}` : ""}
                    {!s.isPublished && " · oculta"}
                  </p>
                </div>
                <Link href={`/admin/horarios/${s.id}`} className="rounded-lg border border-lino px-3 py-1.5 text-xs font-semibold text-piedra-deep hover:bg-lino-soft">
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}

        {showForm ? (
          <form onSubmit={submit} className="card space-y-3 p-4">
            <input type="hidden" name="classDate" value={selected} />
            <input type="hidden" name="stay" value="1" />
            <p className="text-sm font-medium text-piedra-deep">Nueva clase — {formatLongDate(selected)}</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-piedra">Desde
                <input name="startTime" type="time" defaultValue="18:00" required className="field-input mt-1" />
              </label>
              <label className="text-xs text-piedra">Hasta
                <input name="endTime" type="time" defaultValue="20:00" required className="field-input mt-1" />
              </label>
            </div>
            <label className="block text-xs text-piedra">Cupo (máx. {MAX_CAPACITY})
              <input name="capacity" type="number" min={1} max={MAX_CAPACITY} defaultValue={MAX_CAPACITY} className="field-input mt-1" />
            </label>
            <label className="block text-xs text-piedra">Tema (opcional)
              <input name="notes" maxLength={200} placeholder="Puntada margarita…" className="field-input mt-1" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isPublished" defaultChecked className="h-4 w-4 rounded border-lino text-ladrillo" />
              Visible para las alumnas
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="rounded-xl bg-ladrillo px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {pending ? "Guardando…" : "Agregar clase"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-lino px-4 py-2.5 text-sm font-medium text-piedra">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl border border-dashed border-ladrillo/50 py-3 text-sm font-semibold text-ladrillo-deep hover:bg-ladrillo/5"
          >
            + Agregar clase este día
          </button>
        )}
      </section>
    </div>
  );
}
