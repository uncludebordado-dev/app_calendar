import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayKey, formatTime } from "@/lib/date";
import { parseMonthParam, monthRange } from "@/lib/calendar";
import { AdminCalendar, type AdminSlot } from "@/components/admin/AdminCalendar";
import type { AvailabilitySlot } from "@/types/database.types";

export const metadata: Metadata = { title: "Calendario — Administración" };

type Birthday = { day: number; full_name: string };

export default async function AdminCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireAdmin();
  const { mes } = await searchParams;
  const today = todayKey();
  const { year, month } = parseMonthParam(mes, today);
  const { from, to } = monthRange(year, month);

  const supabase = await createClient();
  const [{ data: slots }, { data: bdays }] = await Promise.all([
    supabase
      .from("availability_slots")
      .select("*")
      .gte("class_date", from)
      .lte("class_date", to)
      .order("start_time", { ascending: true }),
    supabase.rpc("birthdays_in_month", { p_year: year, p_month: month + 1 }),
  ]);

  const slotsByDay: Record<string, AdminSlot[]> = {};
  for (const s of (slots ?? []) as AvailabilitySlot[]) {
    (slotsByDay[s.class_date] ??= []).push({
      id: s.id,
      startTime: formatTime(s.start_time),
      endTime: formatTime(s.end_time),
      capacity: s.capacity,
      bookedCount: s.booked_count,
      notes: s.notes,
      isPublished: s.is_published,
    });
  }

  const birthdaysByDay: Record<number, string[]> = {};
  for (const b of (bdays ?? []) as Birthday[]) {
    (birthdaysByDay[b.day] ??= []).push(b.full_name);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Calendario de clases</h1>
      <p className="text-sm text-piedra">
        Tocá un día para ver o agregar clases. Los 🎂 marcan cumpleaños de alumnas.
      </p>
      <AdminCalendar
        year={year}
        month={month}
        slotsByDay={slotsByDay}
        birthdaysByDay={birthdaysByDay}
      />
    </div>
  );
}
