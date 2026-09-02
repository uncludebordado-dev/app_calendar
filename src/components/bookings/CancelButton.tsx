"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { cancelBookingAction } from "@/app/(app)/mis-reservas/actions";

export function CancelButton({
  bookingId,
  withinFreeWindow,
}: {
  bookingId: string;
  withinFreeWindow: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const res = await cancelBookingAction(bookingId);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
      } else {
        setError(res.error ?? "No se pudo cancelar.");
      }
    });
  }

  if (!confirming) {
    return (
      <Button variant="danger" size="md" type="button" onClick={() => setConfirming(true)}>
        Cancelar
      </Button>
    );
  }

  return (
    <div className="w-56 space-y-2 text-right">
      <p className="text-xs text-piedra">
        {withinFreeWindow
          ? "¿Confirmás la baja? Se libera tu lugar."
          : "Faltan menos de 48 h: esta baja suma una sanción. ¿Continuar?"}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" type="button" onClick={() => setConfirming(false)}>
          No
        </Button>
        <Button variant="danger" size="md" type="button" loading={pending} onClick={doCancel}>
          Sí, dar de baja
        </Button>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}
