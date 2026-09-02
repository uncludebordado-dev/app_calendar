"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatTime } from "@/lib/date";
import { ROUTES } from "@/lib/constants";
import type { CalendarSlot } from "@/lib/calendar";
import { bookSlotAction } from "@/app/(app)/calendario/actions";

export function SlotCard({ slot, canBook }: { slot: CalendarSlot; canBook: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justBooked, setJustBooked] = useState(false);

  const full = slot.spotsLeft <= 0;
  const booked = slot.bookedByMe || justBooked;

  function book() {
    setError(null);
    startTransition(async () => {
      const res = await bookSlotAction(slot.id);
      if (res.ok) {
        setJustBooked(true);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo reservar.");
      }
    });
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-piedra-deep">
            {formatTime(slot.startTime)}–{formatTime(slot.endTime)} h
          </p>
          {slot.notes && <p className="mt-0.5 text-sm text-piedra">{slot.notes}</p>}
          <p className="mt-1 text-xs text-piedra">
            {booked
              ? "Tenés tu lugar reservado"
              : slot.isPast
                ? "Ya pasó"
                : full
                  ? "Sin lugares"
                  : slot.spotsLeft === 1
                    ? "Queda 1 lugar"
                    : `Quedan ${slot.spotsLeft} lugares`}
          </p>
        </div>

        <div className="shrink-0">
          {booked ? (
            <Link
              href={ROUTES.misReservas}
              className="inline-flex items-center rounded-lg bg-miel/40 px-3 py-1.5 text-xs font-semibold text-piedra-deep"
            >
              Ver mi reserva
            </Link>
          ) : slot.isPast || full ? (
            <span className="inline-flex items-center rounded-lg bg-lino-soft px-3 py-1.5 text-xs font-medium text-piedra">
              {full ? "Completo" : "Cerrado"}
            </span>
          ) : (
            <Button
              type="button"
              size="md"
              onClick={book}
              loading={pending}
              disabled={!canBook}
              title={!canBook ? "Tu cuenta está bloqueada para reservar" : undefined}
            >
              Reservar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
    </div>
  );
}
