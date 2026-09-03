import type { Metadata } from "next";
import Link from "next/link";
import { requireCompleteProfile } from "@/lib/auth";
import { KitCard } from "@/components/kits/KitCard";
import { KITS } from "@/lib/kits";

export const metadata: Metadata = { title: "Reservá tu kit — un clu de bordado" };

export default async function ReservaKitPage() {
  await requireCompleteProfile("/reserva-kit");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reservá tu kit</h1>
        <p className="mt-1 text-sm text-piedra">
          Elegí el que va con vos. Al reservar, la profe recibe el pedido y te escribe para
          coordinar la entrega. El pago se hace en persona.
        </p>
      </div>

      {KITS.map((kit) => (
        <KitCard key={kit.id} kit={kit} />
      ))}

      <p className="pt-2 text-center text-xs text-piedra">
        <Link href="/calendario" className="underline">← Volver al calendario</Link>
      </p>
    </div>
  );
}
