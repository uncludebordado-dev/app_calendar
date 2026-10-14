import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeAccount } from "@/lib/account";
import { LEGAL } from "@/lib/legal";

/**
 * Cron mensual (Vercel Cron). Elimina las cuentas de alumnas sin actividad en
 * LEGAL.retentionMonths meses (sin ingresos, reservas ni pedidos).
 * Ruta destructiva: exige CRON_SECRET (si falta, rechaza todo).
 */
export const dynamic = "force-dynamic";

const MAX_PER_RUN = 20;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("inactive_account_ids", {
      p_months: LEGAL.retentionMonths,
      p_limit: MAX_PER_RUN,
    });
    if (error) throw error;

    let removed = 0;
    let failed = 0;
    for (const row of data ?? []) {
      const res = await purgeAccount(row.user_id);
      if (res.ok) removed += 1;
      else failed += 1;
    }
    return NextResponse.json({ ok: true, candidates: (data ?? []).length, removed, failed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
