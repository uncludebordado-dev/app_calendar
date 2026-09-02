/**
 * Sanitización de inputs de texto. Complementa (no reemplaza) a la validación
 * con zod y al escape que hace React al renderizar.
 */

// Caracteres de control ASCII + DEL.
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
// Control salvo tab (\x09) y newline (\x0A).
const CONTROL_KEEP_NEWLINES = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/** Colapsa espacios, quita caracteres de control y recorta. */
export function sanitizeText(value: string, maxLength = 200): string {
  return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Nombre propio: sólo letras (incluye acentos y ñ), espacios, guiones y apóstrofes. */
export function sanitizeName(value: string): string {
  return sanitizeText(value, 80).replace(/[^\p{L}\p{M}\s'-]/gu, "");
}

/** Notas / texto libre de la admin: permite saltos de línea, sin HTML. */
export function sanitizeMultiline(value: string, maxLength = 500): string {
  return value
    .replace(CONTROL_KEEP_NEWLINES, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 254);
}
