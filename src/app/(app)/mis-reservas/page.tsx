import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCompleteProfile } from "@/lib/auth";
import { isSlotInPast } from "@/lib/date";
import { ROUTES } from "@/lib/constants";
import { BookingRow } from "@/components/bookings/BookingRow";
import { ButtonLink } from "@/components/ui/Button";
import type { AvailabilitySlot, Booking } from "@/types/database.types";

export const metadata: Metadata = { title: "Mis reservas — un clu de bordado" };

type BookingWithSlot = Booking & { slot: AvailabilitySlot | null };

export default async function MisReservasPage() {
  const profile = await requireCompleteProfile(ROUTES.misReservas);
  if (profile.role === "admin") redirect("/admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("bookings")
    .select("*, slot:availability_slots(*)")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const bookings = (data ?? []) as BookingWithSlot[];

  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && b.slot && !isSlotInPast(b.slot),
  );
  const past = bookings.filter(
    (b) => b.status === "cancelled" || (b.slot && isSlotInPast(b.slot)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mis reservas</h1>
          <p className="mt-1 text-sm text-piedra">
            Cancelá con más de 48 h para no sumar una sanción.
          </p>
        </div>
        <ButtonLink href={ROUTES.calendario} variant="ghost" size="md">
          + Reservar
        </ButtonLink>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-piedra-deep">Próximas</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-lino px-4 py-8 text-center text-sm text-piedra">
            No tenés clases reservadas.{" "}
            <Link href={ROUTES.calendario} className="font-semibold text-ladrillo-deep underline">
              Elegí un horario
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((b) => (
              <li key={b.id}>
                <BookingRow booking={b} slot={b.slot!} kind="upcoming" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-piedra-deep">Historial</h2>
          <ul className="space-y-3">
            {past.map((b) => (
              <li key={b.id}>
                <BookingRow booking={b} slot={b.slot} kind="past" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
