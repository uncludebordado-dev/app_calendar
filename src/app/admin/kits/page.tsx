import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { KitEditForm } from "@/components/admin/KitEditForm";
import { KitOrders } from "@/components/admin/KitOrders";
import type { AdminKitOrderRow, KitRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Kits — un clu de bordado" };

export default async function AdminKitsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data, error }, { data: ordersData, error: ordersError }] = await Promise.all([
    supabase.from("kits").select("*").order("sort_order"),
    supabase.rpc("admin_kit_orders"),
  ]);
  const kits = (data ?? []) as KitRow[];
  const orders = (ordersData ?? []) as AdminKitOrderRow[];
  const kitNames = Object.fromEntries(kits.map((k) => [k.id, k.name]));

  return (
    <div className="space-y-4">
      <Link href="/admin" className="text-sm text-piedra underline">
        ← Volver al dashboard
      </Link>

      <h1 className="text-xl font-semibold">Kits</h1>

      {ordersError ? (
        <p className="rounded-xl border border-dashed border-ladrillo/40 bg-ladrillo/5 px-4 py-6 text-center text-sm text-ladrillo-deep">
          No se pudieron cargar los pedidos. Actualizá la página; si sigue, falta aplicar la
          última migración de la base.
        </p>
      ) : (
        <KitOrders orders={orders} kitNames={kitNames} />
      )}

      <div className="border-t border-lino pt-4">
        <h2 className="text-base font-semibold text-piedra-deep">Editar kits</h2>
        <p className="mt-1 text-sm text-piedra">
          Editá el nombre, la bajada y lo que incluye cada kit. Se ve así en «Reservá tu kit».
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-dashed border-ladrillo/40 bg-ladrillo/5 px-4 py-8 text-center text-sm text-ladrillo-deep">
          No se pudieron cargar los kits. Actualizá la página.
        </p>
      ) : (
        kits.map((kit) => <KitEditForm key={kit.id} kit={kit} />)
      )}
    </div>
  );
}
