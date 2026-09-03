"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { slotSchema } from "@/lib/validation/slot";
import { rpcErrorToMessage } from "@/lib/policy";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseSlotForm(formData: FormData) {
  return slotSchema.safeParse({
    classDate: formData.get("classDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes") ?? "",
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
  });
}

// ---------------------------------------------------------------------------
// Crear franja
// ---------------------------------------------------------------------------
export async function createSlotAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = parseSlotForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { classDate, startTime, endTime, capacity, notes, isPublished } = parsed.data;

  const { error } = await supabase.from("availability_slots").insert({
    class_date: classDate,
    start_time: startTime,
    end_time: endTime,
    capacity,
    notes: notes ?? null,
    is_published: isPublished,
    created_by: admin.id,
  });

  if (error) {
    const msg = error.code === "23505"
      ? "Ya existe un horario ese día a esa hora."
      : "No se pudo crear el horario.";
    return { ok: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/calendario");
  revalidatePath("/calendario");

  // Desde el calendario: no redirige, se queda para seguir cargando.
  if (formData.get("stay")) return { ok: true };
  redirect("/admin/horarios");
}

// ---------------------------------------------------------------------------
// Editar franja
// ---------------------------------------------------------------------------
export async function updateSlotAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!uuidRe.test(id)) return { ok: false, error: "Horario inválido." };

  const parsed = parseSlotForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { classDate, startTime, endTime, capacity, notes, isPublished } = parsed.data;

  const { error } = await supabase
    .from("availability_slots")
    .update({
      class_date: classDate,
      start_time: startTime,
      end_time: endTime,
      capacity,
      notes: notes ?? null,
      is_published: isPublished,
    })
    .eq("id", id);

  if (error) {
    const msg = error.code === "23514"
      ? "El cupo no puede ser menor a las reservas ya confirmadas."
      : error.code === "23505"
        ? "Ya existe un horario ese día a esa hora."
        : "No se pudo guardar.";
    return { ok: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/calendario");
  redirect("/admin/horarios");
}

// ---------------------------------------------------------------------------
// Eliminar franja (sólo si no tiene reservas confirmadas)
// ---------------------------------------------------------------------------
export async function deleteSlotAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!uuidRe.test(id)) return;

  const supabase = await createClient();
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("booked_count")
    .eq("id", id)
    .maybeSingle();

  if (slot && slot.booked_count > 0) {
    redirect(`/admin/horarios/${id}?error=tiene_reservas`);
  }

  await supabase.from("availability_slots").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/calendario");
  redirect("/admin/horarios");
}

// ---------------------------------------------------------------------------
// Publicar / despublicar
// ---------------------------------------------------------------------------
export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!uuidRe.test(id)) return;

  const supabase = await createClient();
  await supabase.from("availability_slots").update({ is_published: next }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/admin/horarios");
  revalidatePath("/calendario");
}

// ---------------------------------------------------------------------------
// Marcar inasistencia / resetear sanciones
// ---------------------------------------------------------------------------
export async function markNoShowAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!uuidRe.test(bookingId)) return;

  const supabase = await createClient();
  await supabase.rpc("mark_no_show", { p_booking_id: bookingId });
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/alumnas");
}

export async function resetStrikesAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!uuidRe.test(userId)) return;

  const supabase = await createClient();
  await supabase.rpc("reset_strikes", { p_user_id: userId });
  revalidatePath("/admin/alumnas");
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------
const METHODS = ["efectivo", "transferencia", "mercadopago", "otro"] as const;

export async function recordPaymentAction(
  _prev: AdminActionResult,
  formData: FormData,
): Promise<AdminActionResult> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  if (!uuidRe.test(userId)) return { ok: false, error: "Alumna inválida." };

  const rawAmount = String(formData.get("amount") ?? "").replace(",", ".").trim();
  const amount = rawAmount === "" ? null : Number(rawAmount);
  if (amount !== null && (Number.isNaN(amount) || amount < 0 || amount > 10_000_000)) {
    return { ok: false, error: "Monto inválido." };
  }

  const method = String(formData.get("method") ?? "efectivo");
  if (!METHODS.includes(method as (typeof METHODS)[number])) {
    return { ok: false, error: "Medio de pago inválido." };
  }

  const paidOn = String(formData.get("paidOn") ?? "").trim() || null;
  if (paidOn && !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
    return { ok: false, error: "Fecha inválida." };
  }

  const slotId = String(formData.get("slotId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_user_id: userId,
    p_slot_id: slotId && uuidRe.test(slotId) ? slotId : null,
    p_amount: amount,
    p_method: method,
    p_paid_on: paidOn,
    p_note: note,
  });

  if (error) return { ok: false, error: rpcErrorToMessage(error.message) };

  revalidatePath("/admin");
  revalidatePath("/admin/alumnas");
  return { ok: true };
}

export async function deletePaymentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!uuidRe.test(paymentId)) return;

  const supabase = await createClient();
  await supabase.rpc("delete_payment", { p_payment_id: paymentId });
  revalidatePath("/admin");
  revalidatePath("/admin/alumnas");
}

// ---------------------------------------------------------------------------
// "Puntito": marcar asistencia y/o pago de una reserva
// ---------------------------------------------------------------------------
export async function setBookingStatusAction(input: {
  bookingId: string;
  attended: boolean;
  paid: boolean;
  amount: number | null;
  method: string;
}): Promise<AdminActionResult> {
  await requireAdmin();
  if (!uuidRe.test(input.bookingId)) return { ok: false, error: "Reserva inválida." };

  const amount =
    input.paid && input.amount != null && Number.isFinite(input.amount) && input.amount >= 0
      ? Math.min(input.amount, 10_000_000)
      : null;
  const method = METHODS.includes(input.method as (typeof METHODS)[number]) ? input.method : "efectivo";

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_booking_status", {
    p_booking_id: input.bookingId,
    p_attended: input.attended,
    p_paid: input.paid,
    p_amount: amount,
    p_method: method,
  });
  if (error) return { ok: false, error: rpcErrorToMessage(error.message) };

  revalidatePath("/admin/alumnas");
  revalidatePath("/admin");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cancelar la reserva de una alumna (desde el panel)
// ---------------------------------------------------------------------------
export async function adminCancelBookingAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!uuidRe.test(bookingId)) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) {
    redirect(`/admin/reservas?error=${encodeURIComponent(rpcErrorToMessage(error.message))}`);
  }
  revalidatePath("/admin/reservas");
  revalidatePath("/calendario");
}
