"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { purgeAccount } from "@/lib/account";
import { isDeletePhrase } from "@/lib/account-confirm";

export async function setNotificationsAction(enabled: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("profiles")
    .update({ notifications_enabled: enabled })
    .eq("id", user.id);

  if (!error) revalidatePath("/mi-perfil");
  return { ok: !error };
}

// ---------------------------------------------------------------------------
// Eliminar mi cuenta (derecho de supresión)
// ---------------------------------------------------------------------------
export async function deleteMyAccountAction(
  confirm: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isDeletePhrase(confirm)) {
    return { ok: false, error: "Escribí la frase de confirmación tal como se indica." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tenés que iniciar sesión." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) return { ok: false, error: "No encontramos tu perfil." };
  if (profile.role === "admin") {
    return { ok: false, error: "La cuenta de administración no se puede eliminar desde acá." };
  }

  if (!(await checkRateLimit("deleteAccount", user.id))) {
    return { ok: false, error: "Demasiados intentos. Probá más tarde." };
  }

  const res = await purgeAccount(user.id);
  if (!res.ok) {
    return { ok: false, error: "No pudimos eliminar la cuenta. Escribinos y lo resolvemos." };
  }

  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}
