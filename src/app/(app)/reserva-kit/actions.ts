"use server";

import { createClient } from "@/lib/supabase/server";
import { isKitId } from "@/lib/kits";
import { checkRateLimit } from "@/lib/rate-limit";

export interface KitActionResult {
  ok: boolean;
  error?: string;
}

export async function reserveKitAction(input: {
  kit: string;
  quantity: number;
  note?: string;
}): Promise<KitActionResult> {
  if (!isKitId(input.kit)) return { ok: false, error: "Kit inválido." };
  const quantity = Math.max(1, Math.min(20, Math.round(input.quantity || 1)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión." };

  if (!(await checkRateLimit("kit", user.id))) {
    return { ok: false, error: "Hiciste demasiados pedidos seguidos. Esperá un rato y probá de nuevo." };
  }

  const { error } = await supabase.from("kit_orders").insert({
    user_id: user.id,
    kit: input.kit,
    quantity,
    note: input.note?.trim().slice(0, 300) || null,
  });

  if (error) {
    return { ok: false, error: "No se pudo registrar la reserva del kit. Probá de nuevo." };
  }
  return { ok: true };
}
