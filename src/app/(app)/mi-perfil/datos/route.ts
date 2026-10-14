import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Descarga de los datos personales de la persona que inició sesión (portabilidad). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const [{ data: profile }, { data: bookings }, { data: kits }, { data: reactions }, { data: subs }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("bookings")
        .select(
          "status, attended, no_show, late_cancellation, penalty_fee, created_at, cancelled_at, slot:availability_slots(class_date, start_time, end_time)",
        )
        .eq("user_id", user.id)
        .order("created_at"),
      supabase.from("kit_orders").select("kit, quantity, note, status, created_at").eq("user_id", user.id),
      supabase.from("news_reactions").select("post_id, emoji, created_at").eq("user_id", user.id),
      supabase.from("push_subscriptions").select("created_at").eq("user_id", user.id),
    ]);

  // Los cobros solo los lee la administración: se consultan acotados a esta persona.
  let payments: { amount: number | null; method: string; paid_on: string }[] = [];
  try {
    const { data } = await createAdminClient()
      .from("payments")
      .select("amount, method, paid_on")
      .eq("user_id", user.id)
      .order("paid_on");
    payments = (data ?? []) as typeof payments;
  } catch {
    /* sin clave de servicio no se incluyen cobros */
  }

  const body = {
    generado: new Date().toISOString(),
    cuenta: { email: user.email ?? null, creada: user.created_at },
    perfil: profile
      ? {
          nombre: profile.full_name,
          telefono: profile.phone_e164,
          nacimiento: profile.birth_date,
          foto: profile.avatar_url,
          avisos_por_email: profile.notifications_enabled,
          sanciones: profile.strikes,
          exenta_de_pago: profile.payment_exempt,
          politica_aceptada: profile.privacy_accepted_at ?? null,
          creado: profile.created_at,
        }
      : null,
    reservas: bookings ?? [],
    pedidos_de_kit: kits ?? [],
    cobros: payments,
    reacciones_a_noticias: reactions ?? [],
    dispositivos_con_notificaciones: (subs ?? []).length,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos-un-clu-de-bordado.json"',
      "Cache-Control": "no-store",
    },
  });
}
