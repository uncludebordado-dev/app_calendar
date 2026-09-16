import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron mensual (Vercel Cron, día 1 de cada mes). Encola el reporte del mes
 * que acaba de terminar con enqueue_monthly_report() y sale por el mismo
 * pipeline de emails de siempre (Resend).
 * Protegido por el header Authorization que envía Vercel Cron cuando existe CRON_SECRET.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("enqueue_monthly_report");
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
