"use client";

import { startTransition, useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema, type CompleteProfileInput } from "@/lib/validation/auth";
import { completeProfileAction, type ActionResult } from "@/app/(auth)/actions";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const initial: ActionResult = { ok: false };

export function CompleteProfileForm({
  next,
  defaultName = "",
  defaultPhone = "",
  defaultBirthDate = "",
  defaultAvatar = null,
  googleAvatar = null,
  mode = "complete",
}: {
  next?: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultBirthDate?: string;
  defaultAvatar?: string | null;
  googleAvatar?: string | null;
  mode?: "complete" | "edit";
}) {
  const [state, formAction, pending] = useActionState(completeProfileAction, initial);
  const [avatar, setAvatar] = useState<string | null>(defaultAvatar);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    mode: "onTouched",
    defaultValues: { fullName: defaultName, phone: defaultPhone, birthDate: defaultBirthDate },
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
      {mode === "complete" && (
        <div className="text-center">
          <h1 className="text-xl font-semibold">Un último paso</h1>
          <p className="mt-1 text-sm text-piedra">
            Necesitamos tu nombre y teléfono para poder reservarte un lugar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <input type="hidden" {...register("phone")} />
        <input type="hidden" name="avatarUrl" value={avatar ?? ""} />

        <div className="flex items-center gap-3">
          <Avatar src={avatar} name={defaultName} size={56} />
          <div className="flex flex-wrap gap-2 text-xs">
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar(null)}
                className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
              >
                Quitar foto
              </button>
            )}
            {googleAvatar && googleAvatar !== avatar && (
              <button
                type="button"
                onClick={() => setAvatar(googleAvatar)}
                className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
              >
                Usar mi foto de Google
              </button>
            )}
          </div>
        </div>

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
