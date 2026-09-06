"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema, type CompleteProfileInput } from "@/lib/validation/auth";
import { completeProfileAction, type ActionResult } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { todayKey } from "@/lib/date";

const initial: ActionResult = { ok: false };
const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB
const CLU_LOGO = "/icon-512.png";

export function CompleteProfileForm({
  next,
  defaultName = "",
  defaultPhone = "",
  defaultBirthDate = "",
  defaultAvatar = null,
  googleAvatar = null,
  isAdmin = false,
  mode = "complete",
}: {
  next?: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultBirthDate?: string;
  defaultAvatar?: string | null;
  googleAvatar?: string | null;
  isAdmin?: boolean;
  mode?: "complete" | "edit";
}) {
  const [state, formAction, pending] = useActionState(completeProfileAction, initial);
  const [avatar, setAvatar] = useState<string | null>(defaultAvatar);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadMsg({ tone: "error", text: "Elegí un archivo de imagen (JPG o PNG)." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadMsg({ tone: "error", text: "La imagen supera los 4 MB. Probá con una más liviana." });
      return;
    }

    setUploading(true);
    setUploadMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no-session");

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatar(pub.publicUrl);
      setUploadMsg({ tone: "ok", text: "Foto lista. Acordate de guardar los cambios." });
    } catch {
      setUploadMsg({
        tone: "error",
        text: "No se pudo subir la foto. Volvé a intentar en un momento.",
      });
    } finally {
      setUploading(false);
    }
  }
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

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Avatar src={avatar} name={defaultName} size={56} />
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft disabled:opacity-50"
              >
                {uploading ? "Subiendo…" : "Subir foto"}
              </button>
              {googleAvatar && googleAvatar !== avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(googleAvatar)}
                  className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
                >
                  Usar mi foto de Google
                </button>
              )}
              {isAdmin && avatar !== CLU_LOGO && (
                <button
                  type="button"
                  onClick={() => setAvatar(CLU_LOGO)}
                  className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
                >
                  Usar el logo del clu
                </button>
              )}
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          {uploadMsg && (
            <p
              className={`text-xs ${
                uploadMsg.tone === "error" ? "text-ladrillo-deep" : "text-green-700"
              }`}
            >
              {uploadMsg.text}
            </p>
          )}
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
          min="1980-01-01"
          max={todayKey()}
          hint="La usamos para saludarte en tu cumpleaños 🎉"
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
