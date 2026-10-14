"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { acceptPolicyAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ROUTES } from "@/lib/constants";
import { useT } from "@/components/i18n/LangProvider";

const initial: ActionResult = { ok: false };

export function AcceptPolicyForm({ next }: { next: string }) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState(acceptPolicyAction, initial);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold">{t("Antes de seguir")}</h1>
        <p className="mt-1 text-sm text-piedra">
          {t("Para usar la aplicación necesitamos que confirmes lo siguiente.")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="card flex items-start gap-3 p-4 text-sm text-piedra-deep">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-lino accent-[rgb(var(--accent))]"
          />
          <span>
            {t("Soy mayor de 18 años y acepto la")}{" "}
            <Link href={ROUTES.privacidad} target="_blank" className="font-semibold text-ladrillo-deep underline">
              {t("Política de privacidad")}
            </Link>{" "}
            {t("y los")}{" "}
            <Link href={ROUTES.terminos} target="_blank" className="font-semibold text-ladrillo-deep underline">
              {t("Términos de uso")}
            </Link>
            .
          </span>
        </label>

        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          {t("Aceptar y continuar")}
        </Button>
      </form>
    </div>
  );
}
