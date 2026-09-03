"use client";

import { useState, useTransition } from "react";
import { reserveKitAction } from "@/app/(app)/reserva-kit/actions";
import { Alert } from "@/components/ui/Alert";
import type { KitInfo } from "@/lib/kits";

function KitArt({ accent }: { accent: string }) {
  return (
    <div className={`flex h-28 items-center justify-center rounded-xl ${accent}`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-ladrillo-deep" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="32" cy="34" r="18" />
        <circle cx="32" cy="34" r="13" strokeDasharray="2 3" />
        <path d="M32 12v6M28 12h8" strokeLinecap="round" />
        <path d="M20 34c4-6 8-6 12 0s8 6 12 0" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function KitCard({ kit }: { kit: KitInfo }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reserve() {
    setErr(null);
    start(async () => {
      const res = await reserveKitAction({ kit: kit.id, quantity: qty, note });
      if (res.ok) setDone(true);
      else setErr(res.error ?? "No se pudo reservar.");
    });
  }

  return (
    <div className="card space-y-3 p-4">
      <KitArt accent={kit.accent} />
      <div>
        <h2 className="text-base font-semibold text-piedra-deep">{kit.name}</h2>
        <p className="text-sm text-piedra">{kit.tagline}</p>
      </div>
      <ul className="space-y-1 text-sm text-piedra-deep">
        {kit.items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden className="text-ladrillo-deep">•</span>
            {it}
          </li>
        ))}
      </ul>

      {done ? (
        <Alert tone="success" title="¡Reserva enviada!">
          La profe recibió tu pedido y te va a escribir para coordinar la entrega y el pago
          en persona.
        </Alert>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-piedra">Cantidad</span>
            <div className="flex items-center rounded-xl border border-lino">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-lg text-piedra-deep"
                aria-label="Menos"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="px-3 py-1.5 text-lg text-piedra-deep"
                aria-label="Más"
              >
                +
              </button>
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Nota para la profe (opcional)"
            className="field-input text-sm"
          />
          {err && <Alert tone="error">{err}</Alert>}
          <button
            type="button"
            onClick={reserve}
            disabled={pending}
            className="w-full rounded-xl bg-ladrillo px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Reservar"}
          </button>
          <p className="text-center text-xs text-piedra-soft">
            Sin pago online: la profe te contacta y el pago se hace en persona.
          </p>
        </>
      )}
    </div>
  );
}
