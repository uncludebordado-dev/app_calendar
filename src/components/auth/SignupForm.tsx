"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
import { signUpAction, type ActionResult } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GoogleButton } from "./GoogleButton";
import { GOOGLE_AUTH_ENABLED, ROUTES } from "@/lib/constants";
import { todayKey } from "@/lib/date";

const initial: ActionResult = { ok: false };

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initial);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: { phone: "" },
  });

  function onValid(_: SignupInput, event?: React.BaseSyntheticEvent) {
    const form = event?.target as HTMLFormElement | undefined;
    if (form) {
      const fd = new FormData(form);
      startTransition(() => formAction(fd));
    }
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
        <input type="hidden" {...register("phone")} />

        <Field
          label="Nombre y apellido"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <PhoneInput
          label="Teléfono"
          value={watch("phone") ?? ""}
          onChange={(v) => setValue("phone", v, { shouldValidate: true, shouldDirty: true })}
          hint="Elegí el país y escribí el resto del número."
          error={errors.phone?.message}
        />

        <Field
          label="Fecha de nacimiento"
          type="date"
          min="1980-01-01"
          max={todayKey()}
          hint="La usamos para saludarte en tu cumpleaños 🎉"
          error={errors.birthDate?.message}
          {...register("birthDate")}
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
