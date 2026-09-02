import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { RATE_LIMITS } from "@/lib/constants";

type Bucket = keyof typeof RATE_LIMITS;

/** IP del cliente a partir de los headers de Vercel. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Devuelve `true` si la acción está permitida. Usa la función de Postgres
 * `check_rate_limit` (SECURITY DEFINER) con el service role.
 */
export async function checkRateLimit(bucket: Bucket, subject: string): Promise<boolean> {
  const { max, windowSeconds } = RATE_LIMITS[bucket];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[rate-limit] SUPABASE_SERVICE_ROLE_KEY ausente: rate limiting deshabilitado.");
    return true;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_subject: subject,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Ante un fallo del rate limiter, no bloqueamos la operación legítima,
    // pero lo dejamos registrado.
    console.error("[rate-limit] fallo consultando check_rate_limit:", error.message);
    return true;
  }
  return data === true;
}
