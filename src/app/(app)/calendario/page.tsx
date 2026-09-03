import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import {
  monthRange,
  parseMonthParam,
  toCalendarSlot,
  groupByDay,
} from "@/lib/calendar";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Alert } from "@/components/ui/Alert";
import { STRIKE_BLOCK_THRESHOLD } from "@/lib/constants";
import type { AvailabilitySlot, Booking } from "@/types/database.types";

export const metadata: Metadata = { title: "Calendario — un clu de bordado" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; bienvenida?: string }>;
}) {
  const profile = await requireCompleteProfile();
  const { mes, bienvenida } = await searchParams;

  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();

  const [{ data: slots }, { data: myBookings }] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("*")
      .eq("is_published", true)
      .gte("class_date", from)
      .lte("class_date", to)
      .order("class_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("bookings")
      .select("slot_id")
      .eq("user_id", profile.id)
      .eq("status", "confirmed"),
  ]);

  const myBookedSlotIds = new Set(
    ((myBookings ?? []) as Pick<Booking, "slot_id">[]).map((b) => b.slot_id),
  );
  const calendarSlots = ((slots ?? []) as AvailabilitySlot[]).map((s) =>
    toCalendarSlot(s, myBookedSlotIds),
  );
  const slotsByDay = groupByDay(calendarSlots);

  return (
    <div className="space-y-5">
      {bienvenida && (
        <Alert tone="success" title={`¡Bienvenida al clu, ${profile.full_name.split(" ")[0]}! 🎉`}>
          Tu cuenta quedó registrada. Ya podés reservar tu lugar en la próxima clase.
        </Alert>
      )}

      <div>
        <h1 className="text-xl font-semibold">Reservá tu clase</h1>
        <p className="mt-1 text-sm text-piedra">
          Tocá un día con lugar disponible y elegí el horario.
        </p>
      </div>

      {profile.blocked && (
        <Alert tone="error" title="Cuenta bloqueada para reservar">
          Acumulaste {STRIKE_BLOCK_THRESHOLD} sanciones por cancelaciones tardías o
          inasistencias. Escribinos por Instagram para reactivarla.
        </Alert>
      )}

      {!profile.blocked && profile.strikes > 0 && (
        <Alert tone="warning">
          Tenés {profile.strikes} {profile.strikes === 1 ? "sanción" : "sanciones"}. A las{" "}
          {STRIKE_BLOCK_THRESHOLD} se bloquea la reserva. Cancelá siempre con más de 48 h.
        </Alert>
      )}

      <CalendarView
        year={year}
        month={month}
        todayKey={today}
        slotsByDay={slotsByDay}
        canBook={!profile.blocked}
      />
    </div>
  );
}
