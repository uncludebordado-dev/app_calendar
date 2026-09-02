import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SlotForm } from "@/components/admin/SlotForm";
import { RosterTable } from "@/components/admin/RosterTable";
import { Alert } from "@/components/ui/Alert";
import { formatTime } from "@/lib/date";
import type { AdminRosterRow, AvailabilitySlot } from "@/types/database.types";

export default async function EditarFranjaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: slot } = await supabase
    .from("availability_slots")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!slot) notFound();
  const s = slot as AvailabilitySlot;

  const { data: rosterData } = await supabase.rpc("admin_rosters_between", {
    p_from: s.class_date,
    p_to: s.class_date,
  });
  const rows = ((rosterData ?? []) as AdminRosterRow[]).filter((r) => r.slot_id === id);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-piedra underline">
        ← Volver
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Editar franja</h1>
        <p className="mt-1 text-sm text-piedra">
          {s.booked_count}/{s.capacity} inscriptas
        </p>
      </div>

      {error === "tiene_reservas" && (
        <Alert tone="error">
          No se puede eliminar una franja con reservas. Cancelá primero las inscripciones
          o simplemente ocultala.
        </Alert>
      )}

      <SlotForm
        mode="edit"
        slotId={s.id}
        bookedCount={s.booked_count}
        defaultValues={{
          classDate: s.class_date,
          startTime: formatTime(s.start_time),
          endTime: formatTime(s.end_time),
          capacity: s.capacity,
          notes: s.notes ?? "",
          isPublished: s.is_published,
        }}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-piedra-deep">Inscriptas</h2>
        <RosterTable rows={rows} slotDate={s.class_date} slotStart={s.start_time} />
      </div>
    </div>
  );
}
