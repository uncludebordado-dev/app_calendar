import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron mensual (Vercel Cron). Encola los avisos de cumpleaños del mes:
 * un email a cada alumna que cumple este mes y otro a la profe.
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
    const { data, error } = await supabase.rpc("enqueue_birthday_month_notices");
    if (error) throw error;
    return NextResponse.json({ ok: true, enqueued: data ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
