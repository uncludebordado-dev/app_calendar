"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePaidAction } from "@/app/admin/actions";
import { CLASS_PRICE_EUR } from "@/lib/constants";
import type { OverviewBooking } from "@/types/database.types";

const METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "bizum", label: "Bizum" },
  { value: "transferencia", label: "Transferencia" },
];

function dateLabel(b: OverviewBooking): string {
  return `${b.class_date} · ${b.start_time} h`;
}

export function StudentDot({ booking }: { booking: OverviewBooking }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [method, setMethod] = useState("efectivo");
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const paid = booking.paid;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function apply(nextPaid: boolean) {
    if (pending) return;
    setErr(null);
    setOkMsg(null);
    start(async () => {
      const res = await togglePaidAction({ bookingId: booking.booking_id, paid: nextPaid, method });
      if (res.ok) {
        setOkMsg(nextPaid ? `Pagó · +${CLASS_PRICE_EUR} €` : "Marcada como no pagó");
        router.refresh();
        setTimeout(() => setOpen(false), 650);
      } else {
        setErr(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${dateLabel(booking)} — ${paid ? "cobrada" : "sin cobrar"}`}
        aria-label={`Reserva del ${dateLabel(booking)}: ${paid ? "cobrada" : "sin cobrar"}. Tocá para cambiar.`}
        className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 ${
          paid ? "border-green-700 bg-green-500" : "border-ladrillo-deep bg-ladrillo"
        }`}
      />

      {open && (
        <div className="absolute right-0 top-6 z-30 w-56 max-w-[calc(100vw-2.5rem)] rounded-xl border border-lino bg-surface p-3 text-left text-xs shadow-soft">
          <p className="mb-2 font-semibold text-piedra-deep">Clase del {dateLabel(booking)}</p>

          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => apply(false)}
              disabled={pending}
              aria-pressed={!paid}
              className={`rounded-lg border px-2 py-2 font-semibold uppercase transition-colors disabled:opacity-50 ${
                !paid
                  ? "border-ladrillo-deep bg-ladrillo text-white"
                  : "border-lino text-piedra hover:bg-lino-soft"
              }`}
            >
              No pagó
            </button>
            <button
              type="button"
              onClick={() => apply(true)}
              disabled={pending}
              aria-pressed={paid}
              className={`rounded-lg border px-2 py-2 font-semibold uppercase transition-colors disabled:opacity-50 ${
                paid
                  ? "border-green-700 bg-green-500 text-white"
                  : "border-lino text-piedra hover:bg-lino-soft"
              }`}
            >
              Pagó
            </button>
          </div>

          <label className="mb-1 block text-piedra">
            Medio de pago
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="mt-0.5 w-full rounded-lg border border-lino bg-surface px-2 py-1"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-1 min-h-[1rem] text-[11px]" aria-live="polite">
            {pending && <span className="text-piedra">Guardando…</span>}
            {!pending && err && <span className="text-ladrillo-deep">{err}</span>}
            {!pending && okMsg && <span className="text-green-700">✓ {okMsg}</span>}
            {!pending && !err && !okMsg && (
              <span className="text-piedra-soft">
                «Pagó» suma {CLASS_PRICE_EUR} € y una asistencia al panel.
              </span>
            )}
          </p>
        </div>
      )}
    </span>
  );
}
