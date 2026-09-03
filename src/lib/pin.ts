"use client";

/**
 * Bloqueo con PIN: pantalla de privacidad local (no reemplaza a la sesión de
 * Supabase, sólo evita que alguien con el teléfono abierto vea la app).
 * El PIN se guarda hasheado en el localStorage de este dispositivo.
 */

const KEY = "clu.pin";
const UNLOCK_KEY = "clu.unlocked";

async function hash(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`clu:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function pinIsSet(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  localStorage.setItem(KEY, await hash(pin));
  sessionStorage.setItem(UNLOCK_KEY, "1");
}

export function removePin(): void {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* noop */
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(KEY);
    return !!stored && stored === (await hash(pin));
  } catch {
    return false;
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "1";
  } catch {
    return true;
  }
}

export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, "1");
  } catch {
    /* noop */
  }
}

export function lockNow(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* noop */
  }
}
