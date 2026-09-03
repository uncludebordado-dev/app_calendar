"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recordPaymentAction, type AdminActionResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { todayKey } from "@/lib/date";

const initial: AdminActionResult = { ok: false };

export function PaymentForm({
  userId,
  studentName,
  compact = false,
}: {
  userId: string;
  studentName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordPaymentAction, initial);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-lino font-medium text-piedra-deep hover:bg-lino-soft ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
        }`}
      >
        + Registrar pago
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-2 space-y-2 rounded-xl border border-lino bg-lino-soft/40 p-3"
    >
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs font-medium text-piedra-deep">Pago de {studentName}</p>

      <div className="flex flex-wrap gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-piedra">Monto ($)</span>
          <input
            name="amount"
            inputMode="decimal"
            placeholder="opcional"
            className="w-full rounded-lg border border-lino bg-surface px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-piedra">Medio</span>
          <select
            name="method"
            defaultValue="efectivo"
            className="w-full rounded-lg border border-lino bg-surface px-2.5 py-1.5 text-sm"
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-piedra">Fecha</span>
          <input
            name="paidOn"
            type="date"
            defaultValue={todayKey()}
            className="w-full rounded-lg border border-lino bg-surface px-2.5 py-1.5 text-sm"
          />
        </label>
      </div>

      <input
        name="note"
        placeholder="Nota (opcional)"
        maxLength={300}
        className="w-full rounded-lg border border-lino bg-surface px-2.5 py-1.5 text-sm"
      />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex gap-2">
        <Button type="submit" size="md" loading={pending}>
          Guardar pago
        </Button>
        <Button type="button" size="md" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
