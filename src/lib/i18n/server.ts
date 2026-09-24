import "server-only";

import { cookies } from "next/headers";
import { CA } from "./ca";
import { LANG_COOKIE, makeT, normalizeLang, type Lang, type TFn } from "./config";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}

/** Traductor para componentes de servidor y server actions. `forceLang` fija el idioma (p. ej. "es" para admin). */
export async function getT(forceLang?: Lang): Promise<{ t: TFn; lang: Lang }> {
  const lang = forceLang ?? (await getLang());
  return { t: makeT(lang, CA), lang };
}
