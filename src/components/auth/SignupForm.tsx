"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signUpAction, type ActionResult } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GoogleButton } from "./GoogleButton";
import { GOOGLE_AUTH_ENABLED, ROUTES } from "@/lib/constants";

const initial: ActionResult = { ok: false };

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
  });

  function onValid(_: SignupInput, event?: React.BaseSyntheticEvent) {
    const form = event?.target as HTMLFormElement | undefined;
    if (form) formAction(new FormData(form));
  }

  if (state.needsEmailConfirmation) {
    return (
      <Alert tone="success" title="Revisá tu correo">
        Te enviamos un enlace para confirmar tu email. Al confirmarlo vas a poder
        reservar tu clase.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Sumate al clu</h1>
        <p className="mt-1 text-sm text-piedra">Creá tu cuenta para reservar tu lugar.</p>
      </div>

      {GOOGLE_AUTH_ENABLED && (
        <>
          <GoogleButton />
          <div className="flex items-center gap-3 text-xs text-piedra-soft">
            <span className="h-px flex-1 bg-lino" />o con tu email
            <span className="h-px flex-1 bg-lino" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}

        <Field
          label="Nombre y apellido"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          placeholder="+54 9 11 5555 5555"
          hint="Con código de país. Lo usamos sólo para avisarte cambios de la clase."
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
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
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, con letras y números."
          error={errors.password?.message}
          {...register("password")}
        />

        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-piedra">
        ¿Ya tenés cuenta?{" "}
        <Link href={ROUTES.login} className="font-semibold text-ladrillo-deep underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
