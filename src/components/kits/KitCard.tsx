"use client";

import { useState, useTransition } from "react";
import { reserveKitAction } from "@/app/(app)/reserva-kit/actions";
import { Alert } from "@/components/ui/Alert";
import { KIT_ACCENT, type KitInfo } from "@/lib/kits";
import { useT } from "@/components/i18n/LangProvider";

const money = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function KitArt({ accent, photoUrl, name }: { accent: string; photoUrl: string | null; name: string }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="h-28 w-full rounded-xl object-cover"
      />
    );
  }
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
  const { t } = useT();
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
      else setErr(res.error ? t(res.error) : t("No se pudo reservar."));
    });
  }

  return (
    <div className="card space-y-3 p-4">
      <KitArt accent={KIT_ACCENT[kit.id]} photoUrl={kit.photoUrl} name={kit.name} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-piedra-deep">{kit.name}</h2>
          <p className="text-sm text-piedra">{kit.tagline}</p>
        </div>
        {kit.priceEur != null && (
          <p className="shrink-0 text-lg font-semibold text-ladrillo-deep">
            {money.format(kit.priceEur)}
          </p>
        )}
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
          La profe recibió tu pedido y te va a escribir para coordinar la entrega y el pago en persona.
        </Alert>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-piedra">{t("Cantidad")}</span>
            <div className="flex items-center rounded-xl border border-lino">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-1.5 text-lg text-piedra-deep"
                aria-label={t("Menos")}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="px-3 py-1.5 text-lg text-piedra-deep"
                aria-label={t("Más")}
              >
                +
              </button>
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder={t("Nota para la profe (opcional)")}
            className="field-input text-sm"
          />
          {err && <Alert tone="error">{err}</Alert>}
          <button
            type="button"
            onClick={reserve}
            disabled={pending}
            className="w-full rounded-xl bg-ladrillo px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? t("Enviando…") : t("Reservar")}
          </button>
          <p className="text-center text-xs text-piedra-soft">
            {t("Sin pago online: la profe te contacta y el pago se hace en persona.")}
          </p>
        </>
      )}
    </div>
  );
}
