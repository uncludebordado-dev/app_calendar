import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Elimina por completo la cuenta de una persona: foto, reservas, pedidos,
 * suscripciones y perfil. Los cobros se conservan anonimizados (sin nombre).
 * Solo se llama desde el servidor, con service role.
 */
export async function purgeAccount(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();

  try {
    const { data: files } = await admin.storage.from("avatars").list(userId, { limit: 100 });
    if (files && files.length > 0) {
      await admin.storage.from("avatars").remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    /* si no hay carpeta o falla, seguimos: la foto no es crítica para el borrado */
  }

  const { error: prepError } = await admin.rpc("prepare_account_deletion", { p_user: userId });
  if (prepError) return { ok: false, error: prepError.message };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
