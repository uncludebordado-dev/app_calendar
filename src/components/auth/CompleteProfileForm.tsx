"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema, type CompleteProfileInput } from "@/lib/validation/auth";
import { completeProfileAction, type ActionResult } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initial: ActionResult = { ok: false };

export function CompleteProfileForm({
  next,
  defaultName = "",
  defaultPhone = "",
  defaultBirthDate = "",
  mode = "complete",
}: {
  next?: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultBirthDate?: string;
  mode?: "complete" | "edit";
}) {
  const [state, formAction, pending] = useActionState(completeProfileAction, initial);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: defaultName,
      phone: defaultPhone,
      birthDate: defaultBirthDate,
    },
  });

  function onValid(_: CompleteProfileInput, event?: React.BaseSyntheticEvent) {
    const form = event?.target as HTMLFormElement | undefined;
    if (form) {
      const fd = new FormData(form);
      startTransition(() => formAction(fd));
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-xl font-semibold">
          {mode === "edit" ? "Mi perfil" : "Un último paso"}
        </h1>
        <p className="mt-1 text-sm text-piedra">
          {mode === "edit"
            ? "Actualizá tus datos cuando quieras."
            : "Necesitamos tu nombre y teléfono para poder reservarte un lugar."}
        </p>
      </div>

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
          hint="Con código de país."
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Field
          label="Fecha de nacimiento"
          type="date"
          hint="Opcional. La usamos para saludarte en tu cumpleaños 🎉"
          error={errors.birthDate?.message}
          {...register("birthDate")}
        />

        {state.error && <Alert tone="error">{state.error}</Alert>}

        <Button type="submit" fullWidth size="lg" loading={pending}>
          {mode === "edit" ? "Guardar cambios" : "Guardar y continuar"}
        </Button>
      </form>
    </div>
  );
}
