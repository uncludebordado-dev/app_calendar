import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/TermsContent";
import { getLang } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "ca" ? "Termes d'ús — un clu de bordado" : "Términos de uso — un clu de bordado",
  };
}

export default async function Page() {
  const lang = await getLang();
  return <TermsContent lang={lang} />;
}
