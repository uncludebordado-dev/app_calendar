"use client";

import { createContext, useContext, useMemo } from "react";
import { CA } from "@/lib/i18n/ca";
import { makeT, type Lang, type TFn } from "@/lib/i18n/config";

interface Ctx {
  lang: Lang;
  t: TFn;
}

const LangContext = createContext<Ctx>({ lang: "es", t: makeT("es", CA) });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => ({ lang, t: makeT(lang, CA) }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): Ctx {
  return useContext(LangContext);
}
