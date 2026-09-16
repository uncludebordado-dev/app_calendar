"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export interface NewsActionResult {
  ok: boolean;
  error?: string;
}

export async function createNewsAction(
  _prev: NewsActionResult,
  formData: FormData,
): Promise<NewsActionResult> {
  const admin = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (title.length < 1 || title.length > 160) {
    return { ok: false, error: "El título va de 1 a 160 caracteres." };
  }
  if (body.length < 1 || body.length > 4000) {
    return { ok: false, error: "Escribí el contenido de la noticia." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("news_posts")
    .insert({ author_id: admin.id, title, body });

  if (error) return { ok: false, error: "No se pudo publicar." };

  revalidatePath("/news");
  return { ok: true };
}

export async function deleteNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const supabase = await createClient();
  await supabase.from("news_posts").delete().eq("id", id);
  revalidatePath("/news");
}

// ---------------------------------------------------------------------------
// Notificaciones push (News)
// ---------------------------------------------------------------------------
export interface PushActionResult {
  ok: boolean;
  error?: string;
}

export async function subscribeToPushAction(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: "No se pudo activar. Probá de nuevo." };
  return { ok: true };
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<PushActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

/** Marca "vistas" las news hasta ahora, para el puntito naranja del nav. */
export async function markNewsSeenAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ news_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
