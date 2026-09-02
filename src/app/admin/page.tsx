import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/date";
import { ButtonLink } from "@/components/ui/Button";
import { SlotRow } from "@/components/admin/SlotRow";
import type { AvailabilitySlot } from "@/types/database.types";

export default async function AdminHomePage() {
  const supabase = await createClient();
  const today = todayKey();

  const { data } = await supabase
    .from("availability_slots")
    .select("*")
    .gte("class_date", today)
    .order("class_date", { ascending: true })
    .order("start_time", { ascending: true });

  const slots = (data ?? []) as AvailabilitySlot[];
  const totalSpots = slots.reduce((n, s) => n + s.capacity, 0);
  const takenSpots = slots.reduce((n, s) => n + s.booked_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Franjas de clase</h1>
          <p className="mt-1 text-sm text-piedra">
            {slots.length} próximas · {takenSpots}/{totalSpots} lugares tomados
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/admin/reservas" variant="ghost">
            Ver inscriptas
          </ButtonLink>
          <ButtonLink href="/admin/franjas/nueva">+ Nueva franja</ButtonLink>
        </div>
      </div>

      <p className="text-xs text-piedra">
        <Link href="/admin/alumnas" className="underline">
          Gestionar alumnas y sanciones →
        </Link>
      </p>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no publicaste ninguna franja.{" "}
          <Link href="/admin/franjas/nueva" className="font-semibold text-ladrillo-deep underline">
            Creá la primera
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {slots.map((slot) => (
            <li key={slot.id}>
              <SlotRow slot={slot} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
