"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBookingStatusAction } from "@/app/admin/actions";
import type { OverviewBooking } from "@/types/database.types";

function label(b: OverviewBooking): string {
  return `${b.class_date} ${b.start_time}`;
}

export function StudentDot({ booking }: { booking: OverviewBooking }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [attended, setAttended] = useState(booking.attended ?? true);
  const [paid, setPaid] = useState(booking.paid);
  const [amount, setAmount] = useState(booking.amount != null ? String(booking.amount) : "");
  const [method, setMethod] = useState("efectivo");
  const [err, setErr] = useState<string | null>(null);

  const green = booking.attended === true && booking.paid;

  function save() {
    setErr(null);
    start(async () => {
      const res = await setBookingStatusAction({
        bookingId: booking.booking_id,
        attended,
        paid,
        amount: paid && amount ? Number(amount.replace(",", ".")) : null,
        method,
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setErr(res.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`${label(booking)} — ${green ? "asistió y pagó" : booking.paid ? "pagó" : booking.attended ? "asistió" : "pendiente"}`}
        aria-label={`Marcar reserva del ${label(booking)}`}
        className={`h-3.5 w-3.5 rounded-full border transition-transform hover:scale-110 ${
          green
            ? "border-green-700 bg-green-500"
            : booking.paid
              ? "border-amber-600 bg-amber-400"
              : "border-ladrillo-deep bg-ladrillo"
        }`}
      />
      {open && (
        <div className="absolute left-1/2 top-6 z-20 w-60 -translate-x-1/2 rounded-xl border border-lino bg-surface p-3 text-left text-xs shadow-soft">
          <p className="mb-2 font-semibold text-piedra-deep">Clase del {label(booking)} h</p>
          <label className="mb-1.5 flex items-center gap-2">
            <input type="checkbox" checked={attended} onChange={(e) => setAttended(e.target.checked)} />
            Asistió
          </label>
          <label className="mb-1.5 flex items-center gap-2">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
            Pagó
          </label>
          {paid && (
            <div className="mb-2 flex gap-2">
              <input
                inputMode="decimal"
                placeholder="Monto €"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-1/2 rounded-lg border border-lino bg-surface px-2 py-1"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-1/2 rounded-lg border border-lino bg-surface px-1 py-1"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transf.</option>
                <option value="mercadopago">MP</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          )}
          {err && <p className="mb-1 text-ladrillo-deep">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg bg-ladrillo px-3 py-1.5 font-semibold text-white disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-lino px-3 py-1.5 font-medium text-piedra"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
