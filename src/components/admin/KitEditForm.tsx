"use client";

import { startTransition, useActionState } from "react";
import { updateKitAction, type KitActionResult } from "@/app/admin/kits/actions";
import type { KitRow } from "@/types/database.types";

const initial: KitActionResult = { ok: false };

export function KitEditForm({ kit }: { kit: KitRow }) {
  const [state, formAction, pending] = useActionState(updateKitAction, initial);

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
