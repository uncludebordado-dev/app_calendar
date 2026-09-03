"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
