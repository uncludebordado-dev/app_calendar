"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { signupSchema, loginSchema, completeProfileSchema } from "@/lib/validation/auth";
import { ROUTES } from "@/lib/constants";

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** presente cuando el registro necesita confirmación por email */
  needsEmailConfirmation?: boolean;
}

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : ROUTES.calendario;
}

// ---------------------------------------------------------------------------
// Registro con email + contraseña
// ---------------------------------------------------------------------------
export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const ip = await getClientIp();
  if (!(await checkRateLimit("signup", ip))) {
    return { ok: false, error: "Demasiados registros desde esta red. Probá más tarde." };
  }

  const supabase = await createClient();
  const { fullName, phone, email, password } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone_e164: phone },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    const msg = /registered|already/i.test(error.message)
      ? "Ese email ya tiene una cuenta. Iniciá sesión."
      : "No pudimos crear la cuenta. Revisá los datos e intentá de nuevo.";
    return { ok: false, error: msg };
  }

  if (!data.session) {
    return { ok: true, needsEmailConfirmation: true };
  }

  redirect(safeNext(formData.get("next")));
}

// ---------------------------------------------------------------------------
// Inicio de sesión con email + contraseña
// ---------------------------------------------------------------------------
export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const ip = await getClientIp();
  if (!(await checkRateLimit("signup", `login:${ip}`))) {
    return { ok: false, error: "Demasiados intentos. Esperá unos minutos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: "Email o contraseña incorrectos." };
  }

  redirect(safeNext(formData.get("next")));
}

// ---------------------------------------------------------------------------
// Completar perfil (obligatorio antes de reservar; típico tras Google OAuth)
// ---------------------------------------------------------------------------
export async function completeProfileAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = completeProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sesión expirada. Volvé a iniciar sesión." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone_e164: parsed.data.phone })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "No pudimos guardar tus datos. Intentá de nuevo." };
  }

  redirect(safeNext(formData.get("next")));
}

// ---------------------------------------------------------------------------
// Cerrar sesión
// ---------------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.home);
}
