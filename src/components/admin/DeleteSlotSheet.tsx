"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSlotInlineAction } from "@/app/admin/actions";
import { formatLongDate } from "@/lib/date";
import { TrashIcon } from "@/components/layout/icons";
import type { AdminSlot } from "./AdminCalendar";

export function DeleteSlotSheet({
  dateKey,
  slots,
  onClose,
}: {
  dateKey: string;
  slots: AdminSlot[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await deleteSlotInlineAction(id);
      if (res.ok) {
        router.refresh();
        if (slots.filter((s) => s.id !== id).length === 0) onClose();
        setConfirmId(null);
      } else {
        setError(res.error ?? "No se pudo eliminar.");
        setConfirmId(null);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Eliminar clase">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-md space-y-3 rounded-t-2xl bg-surface p-4 shadow-soft"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-lino" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-piedra">Eliminar clase</p>
          <h3 className="text-base font-semibold capitalize text-piedra-deep">{formatLongDate(dateKey)}</h3>
        </div>

        <ul className="space-y-2">
          {slots.map((s) => {
            const blocked = s.bookedCount > 0;
            const confirming = confirmId === s.id;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-lino p-3">
                <div className="min-w-0">
                  <p className="font-semibold text-piedra-deep">
                    {s.startTime}–{s.endTime} h
                  </p>
                  <p className="text-xs text-piedra">
                    {blocked
                      ? `${s.bookedCount} inscripta${s.bookedCount === 1 ? "" : "s"} — no se puede eliminar`
                      : "Sin inscriptas"}
                    {s.notes ? ` · ${s.notes}` : ""}
                  </p>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={pending}
                      className="rounded-lg bg-ladrillo px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {pending ? "Eliminando…" : "Sí, eliminar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      disabled={pending}
                      className="rounded-lg border border-lino px-3 py-2 text-xs font-medium text-piedra"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(s.id)}
                    disabled={blocked}
                    aria-label={`Eliminar la clase de ${s.startTime}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ladrillo/40 text-ladrillo-deep hover:bg-ladrillo/10 disabled:opacity-30"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="rounded-xl border border-ladrillo/40 bg-ladrillo/10 px-3 py-2 text-xs text-ladrillo-deep">
            {error}
          </p>
        )}

        <button type="button" onClick={onClose} className="w-full rounded-xl border border-lino py-2.5 text-sm font-medium text-piedra">
          Cerrar
        </button>
      </div>
    </div>
  );
}
