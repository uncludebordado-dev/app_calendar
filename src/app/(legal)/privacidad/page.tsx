import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/PrivacyContent";
import { getLang } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "ca" ? "Política de privacitat — un clu de bordado" : "Política de privacidad — un clu de bordado",
  };
}

export default async function Page() {
  const lang = await getLang();
  return <PrivacyContent lang={lang} />;
}
