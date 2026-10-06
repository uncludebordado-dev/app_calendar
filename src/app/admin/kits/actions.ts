"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { isKitId } from "@/lib/kits";
import type { KitOrder } from "@/types/database.types";

export interface KitActionResult {
  ok: boolean;
  error?: string;
}

const ORDER_STATUSES: KitOrder["status"][] = ["pendiente", "contactada", "entregada", "cancelada"];
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setKitOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = ORDER_STATUSES.find((s) => s === String(formData.get("status") ?? ""));
  if (!uuidRe.test(id) || !status) return;

  const supabase = await createClient();
  await supabase.from("kit_orders").update({ status }).eq("id", id);
  revalidatePath("/admin/kits");
  revalidatePath("/admin");
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

  const rawPrice = String(formData.get("priceEur") ?? "").replace(",", ".").trim();
  let priceEur: number | null = null;
  if (rawPrice !== "") {
    const n = Number(rawPrice);
    if (Number.isNaN(n) || n < 0 || n > 10_000) {
      return { ok: false, error: "Precio inválido." };
    }
    priceEur = n;
  }

  const rawPhoto = String(formData.get("photoUrl") ?? "").trim();
  const photoUrl = rawPhoto && /^https:\/\/[\w.-]+\/\S+$/.test(rawPhoto) ? rawPhoto.slice(0, 500) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("kits")
    .update({ name, tagline, items, price_eur: priceEur, photo_url: photoUrl })
    .eq("id", id);

  if (error) return { ok: false, error: "No se pudo guardar." };

  revalidatePath("/admin/kits");
  revalidatePath("/reserva-kit");
  return { ok: true };
}
