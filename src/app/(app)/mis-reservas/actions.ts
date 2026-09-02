"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rpcErrorToMessage } from "@/lib/policy";
import { ROUTES } from "@/lib/constants";

export interface CancelActionResult {
  ok: boolean;
  error?: string;
  late?: boolean;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelBookingAction(bookingId: string): Promise<CancelActionResult> {
  if (!uuidRe.test(bookingId)) return { ok: false, error: "Reserva inválida." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión." };

  const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });

  if (error) {
    return { ok: false, error: rpcErrorToMessage(error.message) };
  }

  revalidatePath(ROUTES.misReservas);
  revalidatePath(ROUTES.calendario);
  return { ok: true, late: data?.late_cancellation ?? false };
}
