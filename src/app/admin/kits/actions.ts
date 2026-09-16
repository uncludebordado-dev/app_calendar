"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { isKitId } from "@/lib/kits";

export interface KitActionResult {
  ok: boolean;
  error?: string;
}

export async function updateKitAction(
  _prev: KitActionResult,
  formData: FormData,
): Promise<KitActionResult> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!isKitId(id)) return { ok: false, error: "Kit inválido." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 80) {
    return { ok: false, error: "El nombre va de 1 a 80 caracteres." };
  }
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 160);
  const items = String(formData.get("items") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (items.length === 0) {
    return { ok: false, error: "Cargá al menos un ítem." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("kits")
    .update({ name, tagline, items })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidatePath("/admin/kits");
  revalidatePath("/reserva-kit");
  return { ok: true };
}
