import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import type { Profile } from "@/types/database.types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data ?? null;
}

export function profileIsComplete(profile: Profile | null): boolean {
  return !!profile && profile.full_name.trim() !== "" && profile.phone_e164.trim() !== "";
}

/** Exige sesión. Redirige a login conservando el destino. */
export async function requireUser(nextPath: string = ROUTES.calendario) {
  const user = await getSessionUser();
  if (!user) redirect(`${ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** Exige sesión + perfil completo (nombre y teléfono). */
export async function requireCompleteProfile(nextPath: string = ROUTES.calendario) {
  const profile = await getProfile();
  if (!profile) redirect(`${ROUTES.login}?next=${encodeURIComponent(nextPath)}`);
  if (!profileIsComplete(profile)) {
    redirect(`${ROUTES.completarPerfil}?next=${encodeURIComponent(nextPath)}`);
  }
  return profile!;
}

/** Exige rol admin (además de la comprobación del middleware). */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect(ROUTES.login);
  if (profile.role !== "admin") redirect(ROUTES.calendario);
  return profile;
}
