"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { updateKitAction, type KitActionResult } from "@/app/admin/kits/actions";
import { createClient } from "@/lib/supabase/client";
import type { KitRow } from "@/types/database.types";

const initial: KitActionResult = { ok: false };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export function KitEditForm({ kit }: { kit: KitRow }) {
  const [state, formAction, pending] = useActionState(updateKitAction, initial);
  const [photoUrl, setPhotoUrl] = useState<string | null>(kit.photo_url);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadErr("Elegí un archivo de imagen (JPG, PNG o WEBP).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setUploadErr("La imagen supera los 5 MB.");
      return;
    }

    setUploading(true);
    setUploadErr(null);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const path = `${kit.id}/foto-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("kit-photos")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (error) throw error;

      const { data } = supabase.storage.from("kit-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch {
      setUploadErr("No se pudo subir la foto. Probá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        startTransition(() => formAction(new FormData(form)));
      }}
      className="card space-y-3 p-4"
    >
      <input type="hidden" name="id" value={kit.id} />
      <input type="hidden" name="photoUrl" value={photoUrl ?? ""} />

      <div className="space-y-2">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={kit.name} className="h-28 w-full rounded-xl object-cover" />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-lino text-xs text-piedra">
            Sin foto — se muestra un ilustrativo
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft disabled:opacity-50"
          >
            {uploading ? "Subiendo…" : photoUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={() => setPhotoUrl(null)}
              className="rounded-lg border border-lino px-2.5 py-1 font-medium text-piedra hover:bg-lino-soft"
            >
              Quitar foto
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
        {uploadErr && <p className="text-xs text-ladrillo-deep">{uploadErr}</p>}
      </div>

      <div>
        <label className="field-label" htmlFor={`name-${kit.id}`}>Nombre</label>
        <input
          id={`name-${kit.id}`}
          name="name"
          defaultValue={kit.name}
          maxLength={80}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`price-${kit.id}`}>Precio (€)</label>
        <input
          id={`price-${kit.id}`}
          name="priceEur"
          inputMode="decimal"
          defaultValue={kit.price_eur ?? ""}
          placeholder="p. ej. 25"
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`tagline-${kit.id}`}>Bajada</label>
        <input
          id={`tagline-${kit.id}`}
          name="tagline"
          defaultValue={kit.tagline}
          maxLength={160}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor={`items-${kit.id}`}>
          Qué incluye (un ítem por línea)
        </label>
        <textarea
          id={`items-${kit.id}`}
          name="items"
          defaultValue={kit.items.join("\n")}
          rows={Math.max(4, kit.items.length)}
          className="field-input"
        />
      </div>

      {state.error && <p className="text-xs text-ladrillo-deep">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700">✓ Guardado</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-ladrillo px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
