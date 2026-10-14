import type { Metadata } from "next";
import { CookiesContent } from "@/components/legal/CookiesContent";
import { getLang } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "ca" ? "Galetes — un clu de bordado" : "Cookies — un clu de bordado",
  };
}

export default async function Page() {
  const lang = await getLang();
  return <CookiesContent lang={lang} />;
}
