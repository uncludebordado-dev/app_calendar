import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/date";
import { ButtonLink } from "@/components/ui/Button";
import { SlotRow } from "@/components/admin/SlotRow";
import type { AvailabilitySlot } from "@/types/database.types";

export const metadata = { title: "Horarios — Administración" };

export default async function AdminHorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  const { ver } = await searchParams;
  const showPast = ver === "todas";
  const supabase = await createClient();
  const today = todayKey();

  let query = supabase
    .from("availability_slots")
    .select("*")
    .order("class_date", { ascending: !showPast })
    .order("start_time", { ascending: true });
  if (!showPast) query = query.gte("class_date", today);

  const { data } = await query;
  const slots = (data ?? []) as AvailabilitySlot[];
  const upcoming = slots.filter((s) => s.class_date >= today);
  const totalSpots = upcoming.reduce((n, s) => n + s.capacity, 0);
  const takenSpots = upcoming.reduce((n, s) => n + s.booked_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Horarios de clase</h1>
          <p className="mt-1 text-sm text-piedra">
            {upcoming.length} próximas · {takenSpots}/{totalSpots} lugares tomados
          </p>
        </div>
        <ButtonLink href="/admin/horarios/nueva">+ Nueva franja</ButtonLink>
      </div>

      <p className="text-xs">
        <Link
          href={showPast ? "/admin/horarios" : "/admin/horarios?ver=todas"}
          className="text-piedra underline"
        >
          {showPast ? "← Ver sólo próximas" : "Ver también las pasadas →"}
        </Link>
      </p>

      {slots.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no publicaste ningun horario.{" "}
          <Link href="/admin/horarios/nueva" className="font-semibold text-ladrillo-deep underline">
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
