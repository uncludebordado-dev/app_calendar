export type Lang = "es" | "ca";

export const LANG_COOKIE = "lang";
export const DEFAULT_LANG: Lang = "es";

export function normalizeLang(v: string | null | undefined): Lang {
  return v === "ca" ? "ca" : "es";
}

export type Vars = Record<string, string | number>;
export type TFn = (es: string, vars?: Vars) => string;

/**
 * El texto en español ES la clave. En catalán se busca en CA; si falta una
 * traducción se muestra el español (nunca se rompe la pantalla).
 * Variables: "Tenés {n} sanciones" + { n: 2 }.
 */
export function makeT(lang: Lang, ca: Record<string, string>): TFn {
  return (es, vars) => {
    const base = lang === "ca" ? (ca[es] ?? es) : es;
    if (!vars) return base;
    return base.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
  };
}

export const LOCALE: Record<Lang, string> = { es: "es-AR", ca: "ca-ES" };
