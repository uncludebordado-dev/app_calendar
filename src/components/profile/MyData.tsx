"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { deleteMyAccountAction } from "@/app/(app)/mi-perfil/actions";
import { useT } from "@/components/i18n/LangProvider";

const WORD = "ELIMINAR";

export function MyData() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
        {!open ? (
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            {t("Eliminar mi cuenta")}
          </Button>
        ) : (
          <div className="space-y-2 rounded-xl border border-ladrillo/40 bg-ladrillo/5 p-3">
            <label className="block text-xs text-piedra-deep">
              {t("Escribí {word} para confirmar", { word: WORD })}
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoComplete="off"
                className="field-input mt-1"
              />
            </label>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                loading={pending}
                disabled={text.trim().toUpperCase() !== WORD}
                onClick={remove}
              >
                {t("Eliminar definitivamente")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  setText("");
                  setError(null);
                }}
              >
                {t("Cancelar")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
