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
      ? "Ya existe una franja ese día a esa hora."
      : "No se pudo crear la franja.";
    return { ok: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/calendario");
  redirect("/admin");
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
  if (!uuidRe.test(id)) return { ok: false, error: "Franja inválida." };

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
        ? "Ya existe una franja ese día a esa hora."
        : "No se pudo guardar.";
    return { ok: false, error: msg };
  }

  revalidatePath("/admin");
  revalidatePath("/calendario");
  redirect("/admin");
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
    redirect(`/admin/franjas/${id}?error=tiene_reservas`);
  }

  await supabase.from("availability_slots").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/calendario");
  redirect("/admin");
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
