import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { todayKey } from "@/lib/date";
import {
  monthRange,
  parseMonthParam,
  toCalendarSlot,
  groupByDay,
} from "@/lib/calendar";
import Link from "next/link";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Alert } from "@/components/ui/Alert";
import { STRIKE_BLOCK_THRESHOLD } from "@/lib/constants";
import { GiftIcon } from "@/components/layout/icons";
import type { AvailabilitySlot, Booking } from "@/types/database.types";

export const metadata: Metadata = { title: "Calendario — un clu de bordado" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; bienvenida?: string }>;
}) {
  const profile = await requireCompleteProfile();
  if (profile.role === "admin") redirect("/admin/calendario");
  const { mes, bienvenida } = await searchParams;

  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();

  const [{ data: slots }, { data: myBookings }, { data: bdays }] = await Promise.all([
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
    supabase.rpc("birthdays_in_month", { p_year: year, p_month: month + 1 }),
  ]);

  const myBookedSlotIds = new Set(
    ((myBookings ?? []) as Pick<Booking, "slot_id">[]).map((b) => b.slot_id),
  );
  const calendarSlots = ((slots ?? []) as AvailabilitySlot[]).map((s) =>
    toCalendarSlot(s, myBookedSlotIds),
  );
  const slotsByDay = groupByDay(calendarSlots);

  const birthdaysByDay: Record<number, string[]> = {};
  for (const b of (bdays ?? []) as { day: number; full_name: string }[]) {
    (birthdaysByDay[b.day] ??= []).push(b.full_name);
  }

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
        birthdaysByDay={birthdaysByDay}
      />

      <Link
        href="/reserva-kit"
        className="flex items-center gap-3 rounded-xl2 border border-ladrillo/40 bg-ladrillo/5 p-4 transition-colors hover:bg-ladrillo/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ladrillo text-white">
          <GiftIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block font-semibold text-piedra-deep">Reservá tu kit</span>
          <span className="block text-sm text-piedra">
            Básico, Medium o Pro — te lo prepara la profe.
          </span>
        </span>
        <span aria-hidden className="ml-auto text-piedra">→</span>
      </Link>
    </div>
  );
}
