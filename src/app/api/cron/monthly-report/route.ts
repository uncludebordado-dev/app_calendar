import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron DIARIO (Vercel Cron, ~23 h Europe/Madrid). Sólo hace algo el último
 * día del mes: ahí arma y encola el reporte del mes que está terminando
 * (así la clase de ese mismo día ya entra contada). Cualquier otro día no
 * hace nada. Protegido por el header Authorization que manda Vercel Cron.
 */
export const dynamic = "force-dynamic";

function isLastDayOfMonthMadrid(): boolean {
  const now = new Date();
  const todayMadrid = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowMadrid = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
  // Si mañana cambia de mes, hoy es el último día.
  return todayMadrid.slice(0, 7) !== tomorrowMadrid.slice(0, 7);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isLastDayOfMonthMadrid()) {
    return NextResponse.json({ ok: true, skipped: "no es el último día del mes" });
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
