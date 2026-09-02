"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { signInAction, type ActionResult } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GoogleButton } from "./GoogleButton";
import { ROUTES } from "@/lib/constants";

const initial: ActionResult = { ok: false };

export function LoginForm({ next, authError }: { next?: string; authError?: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, initial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: "onTouched" });

  function onValid(_: LoginInput, event?: React.BaseSyntheticEvent) {
    const form = event?.target as HTMLFormElement | undefined;
    if (form) formAction(new FormData(form));
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Hola de nuevo</h1>
        <p className="mt-1 text-sm text-piedra">Entrá para reservar o ver tus clases.</p>
      </div>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-piedra-soft">
        <span className="h-px flex-1 bg-lino" />o con tu email<span className="h-px flex-1 bg-lino" />
      </div>

      <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Field
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {(state.error || authError) && (
          <Alert tone="error">
            {state.error ?? "No pudimos iniciar sesión. Probá de nuevo."}
          </Alert>
        )}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-piedra">
        ¿Todavía no tenés cuenta?{" "}
        <Link href={ROUTES.registro} className="font-semibold text-ladrillo-deep underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
