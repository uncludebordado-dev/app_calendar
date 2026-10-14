"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { acceptPolicyAction, type ActionResult } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ROUTES } from "@/lib/constants";
import { useT } from "@/components/i18n/LangProvider";

const initial: ActionResult = { ok: false };

/** Ventana que aparece una sola vez por alumna, la primera vez que entra a la app. */
export function PrivacyModal() {
  const { t } = useT();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(acceptPolicyAction, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 shadow-soft">
        <div>
          <h2 id="privacy-title" className="text-lg font-semibold text-piedra-deep">
            {t("Antes de seguir")}
          </h2>
          <p className="mt-1 text-sm text-piedra">
            {t("Cuidamos tus datos. Para usar la aplicación necesitamos que confirmes lo siguiente.")}
          </p>
        </div>

        <ul className="space-y-1.5 text-sm text-piedra-deep">
          <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">•</span>{t("La aplicación es solo para mayores de 18 años.")}</li>
          <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">•</span>{t("Guardamos tus datos para gestionar tus reservas y cobros.")}</li>
          <li className="flex gap-2"><span aria-hidden className="text-ladrillo-deep">•</span>{t("Puedes descargar o eliminar tus datos cuando quieras desde Mi perfil.")}</li>
        </ul>

        <p className="text-xs text-piedra">
          <Link href={ROUTES.privacidad} target="_blank" className="font-semibold text-ladrillo-deep underline">
            {t("Política de privacidad")}
          </Link>{" · "}
          <Link href={ROUTES.terminos} target="_blank" className="font-semibold text-ladrillo-deep underline">
            {t("Términos de uso")}
          </Link>
        </p>

        {state.error && <Alert tone="error">{state.error}</Alert>}

        <form onSubmit={onSubmit} className="space-y-2">
          <input type="hidden" name="acceptTerms" value="on" />
          <Button type="submit" fullWidth size="lg" loading={pending} autoFocus>
            {t("Soy mayor de 18 años y acepto")}
          </Button>
        </form>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="ghost" fullWidth>
            {t("Salir")}
          </Button>
        </form>
      </div>
    </div>
  );
}
