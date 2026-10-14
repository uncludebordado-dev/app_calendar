/**
 * Frase que la persona debe escribir para eliminar su cuenta. Se valida en el
 * cliente (para habilitar el botón) y en el servidor (la fuente de verdad).
 * Se acepta la frase en español o en catalán, sin distinguir mayúsculas.
 */
export const DELETE_PHRASES = ["quiero eliminar mi cuenta", "vull eliminar el meu compte"] as const;

export function normalizePhrase(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isDeletePhrase(input: string): boolean {
  const n = normalizePhrase(input);
  return (DELETE_PHRASES as readonly string[]).includes(n);
}
