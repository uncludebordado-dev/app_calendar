import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { KitCard } from "@/components/kits/KitCard";
import type { KitInfo } from "@/lib/kits";
import type { KitRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Reservá tu kit — un clu de bordado" };

export default async function ReservaKitPage() {
  await requireCompleteProfile("/reserva-kit");

  const supabase = await createClient();
  const { data } = await supabase.from("kits").select("*").order("sort_order");
  const kits: KitInfo[] = ((data ?? []) as KitRow[]).map((k) => ({
    id: k.id,
    name: k.name,
    tagline: k.tagline,
    items: k.items,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reservá tu kit</h1>
        <p className="mt-1 text-sm text-piedra">
          Elegí el que va con vos. Al reservar, la profe recibe el pedido y te escribe para
          coordinar la entrega. El pago se hace en persona.
        </p>
      </div>

      {kits.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-8 text-center text-sm text-piedra">
          Todavía no hay kits cargados.
        </p>
      ) : (
        kits.map((kit) => <KitCard key={kit.id} kit={kit} />)
      )}

      <p className="pt-2 text-center text-xs text-piedra">
        <Link href="/calendario" className="underline">← Volver al calendario</Link>
      </p>
    </div>
  );
}
