"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteMyAccountAction } from "@/app/(app)/mi-perfil/actions";
import { useT } from "@/components/i18n/LangProvider";
import { normalizePhrase } from "@/lib/account-confirm";

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const phrase = t("Quiero eliminar mi cuenta");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = normalizePhrase(text) === normalizePhrase(phrase);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteMyAccountAction(text);
      if (res.ok) {
        window.location.href = "/?cuenta=eliminada";
      } else {
        setError(res.error ?? "No se pudo eliminar la cuenta.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={() => !pending && onClose()} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-soft ring-2 ring-ladrillo">
        <div className="flex items-center gap-3 bg-ladrillo px-5 py-4 text-white">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl">
            ⚠
          </span>
          <h2 id="delete-title" className="text-lg font-bold leading-tight">
            {t("¡Atención! Vas a eliminar tu cuenta")}
          </h2>
        </div>

        <div className="space-y-4 p-5">
          <div id="delete-desc" className="space-y-2 text-sm text-piedra-deep">
            <p className="font-semibold text-ladrillo-deep">{t("Esta acción no se puede deshacer.")}</p>
            <ul className="space-y-1.5">
              <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">✕</span>{t("Se borran tu perfil, tus reservas, tus pedidos y tu foto.")}</li>
              <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">✕</span>{t("Pierdes los lugares que tengas reservados.")}</li>
              <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">✕</span>{t("Los registros de cobro quedan sin tu nombre.")}</li>
            </ul>
          </div>

          <label className="block text-sm font-medium text-piedra-deep">
            {t("Para confirmar, escribe exactamente:")}
            <span className="mt-1 block rounded-lg bg-ladrillo/10 px-3 py-2 text-center font-semibold text-ladrillo-deep">
              {phrase}
            </span>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={phrase}
              aria-label={t("Para confirmar, escribe exactamente:")}
              className="field-input mt-2"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl border border-ladrillo/40 bg-ladrillo/10 px-3 py-2 text-sm text-ladrillo-deep">
              {t(error)}
            </p>
          )}

          <div className="space-y-2">
            <Button type="button" size="lg" fullWidth onClick={onClose} disabled={pending}>
              {t("No, mantener mi cuenta")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="lg"
              fullWidth
              loading={pending}
              disabled={!matches}
              onClick={remove}
            >
              {t("Eliminar mi cuenta definitivamente")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyData() {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-piedra-deep">{t("Descargar mis datos")}</p>
        <p className="mb-2 text-xs text-piedra">
          {t("Un archivo con todo lo que guardamos de vos: perfil, reservas, pedidos y cobros.")}
        </p>
        <a
          href="/mi-perfil/datos"
          className="inline-flex rounded-xl border border-lino px-4 py-2.5 text-sm font-semibold text-piedra-deep hover:bg-lino-soft"
        >
          {t("Descargar")}
        </a>
      </div>

      <div className="border-t border-lino pt-4">
        <p className="font-medium text-piedra-deep">{t("Eliminar mi cuenta")}</p>
        <p className="mb-2 text-xs text-piedra">
          {t("Se borran tu perfil, reservas, pedidos y foto. Los registros de cobro quedan sin tu nombre. No se puede deshacer.")}
        </p>
        <Button type="button" variant="danger" onClick={() => setOpen(true)}>
          {t("Eliminar mi cuenta")}
        </Button>
      </div>

      {open && <DeleteAccountDialog onClose={() => setOpen(false)} />}
    </div>
  );
}
