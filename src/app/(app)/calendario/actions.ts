"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { rpcErrorToMessage } from "@/lib/policy";
import { ROUTES } from "@/lib/constants";

export interface BookingActionResult {
  ok: boolean;
  error?: string;
  bookingId?: string;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reserva atómica de un horario. La condición de carrera la resuelve book_slot() en Postgres. */
export async function bookSlotAction(slotId: string): Promise<BookingActionResult> {
  if (!uuidRe.test(slotId)) return { ok: false, error: "Horario inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión." };

  if (!(await checkRateLimit("booking", user.id))) {
    return { ok: false, error: "Hiciste muchas reservas seguidas. Esperá un rato." };
  }

  const { data, error } = await supabase.rpc("book_slot", { p_slot_id: slotId });

  if (error) {
    return { ok: false, error: rpcErrorToMessage(error.message) };
  }

  revalidatePath(ROUTES.calendario);
  revalidatePath(ROUTES.misReservas);
  return { ok: true, bookingId: data?.id };
}
