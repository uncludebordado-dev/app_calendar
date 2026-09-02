import { FREE_CANCEL_HOURS, STRIKE_BLOCK_THRESHOLD } from "@/lib/constants";
import { hoursUntilSlot } from "@/lib/date";
import type { AvailabilitySlot, Profile } from "@/types/database.types";

/**
 * Reglas de cancelación / sanción (única fuente de verdad para la UI;
 * el servidor las re‑valida en cancel_booking()).
 *
 *  - Cancelar con +48h  -> libera cupo, sin penalidad.
 *  - Cancelar con -48h  -> libera cupo + 1 strike.
 *  - No presentarse     -> 1 strike (lo marca la admin).
 *  - 3 strikes          -> bloqueo automático de nuevas reservas.
 */

export function canCancelWithoutPenalty(
  slot: Pick<AvailabilitySlot, "class_date" | "start_time">,
): boolean {
  return hoursUntilSlot(slot) >= FREE_CANCEL_HOURS;
}

export function cancelIsLate(
  slot: Pick<AvailabilitySlot, "class_date" | "start_time">,
): boolean {
  const h = hoursUntilSlot(slot);
  return h > 0 && h < FREE_CANCEL_HOURS;
}

export interface BookingEligibility {
  canBook: boolean;
  reason?: "profile_incomplete" | "blocked";
  message?: string;
}

export function checkBookingEligibility(profile: Profile | null): BookingEligibility {
  if (!profile || !profile.full_name || !profile.phone_e164) {
    return {
      canBook: false,
      reason: "profile_incomplete",
      message: "Completá tu nombre y teléfono antes de reservar.",
    };
  }
  if (profile.blocked) {
    return {
      canBook: false,
      reason: "blocked",
      message: `Tu cuenta está bloqueada para reservar por acumular ${STRIKE_BLOCK_THRESHOLD} sanciones. Escribinos por Instagram.`,
    };
  }
  return { canBook: true };
}

/** Mensajes estables que devuelven las funciones de Postgres. */
export const RPC_ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: "Tenés que iniciar sesión.",
  profile_incomplete: "Completá tu nombre y teléfono antes de reservar.",
  user_blocked: "Tu cuenta está bloqueada para reservar por acumular sanciones.",
  already_booked: "Ya tenés un lugar reservado en esta clase.",
  slot_not_found: "Esa franja ya no está disponible.",
  slot_full: "Se ocupó el último lugar mientras confirmabas. Probá con otro horario.",
  slot_past: "Esa clase ya empezó o pasó.",
  booking_not_found: "No encontramos esa reserva.",
  not_owner: "No podés modificar una reserva que no es tuya.",
  already_cancelled: "Esa reserva ya estaba cancelada.",
  not_admin: "Necesitás permisos de administración.",
  rate_limited: "Hiciste demasiados intentos seguidos. Esperá un rato y probá de nuevo.",
};

export function rpcErrorToMessage(raw: string | undefined | null): string {
  if (!raw) return "Ocurrió un error. Probá de nuevo.";
  const key = Object.keys(RPC_ERROR_MESSAGES).find((k) => raw.includes(k));
  return key ? RPC_ERROR_MESSAGES[key] : "Ocurrió un error. Probá de nuevo.";
}
