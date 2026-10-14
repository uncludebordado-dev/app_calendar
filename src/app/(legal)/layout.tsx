import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { LangSwitch } from "@/components/i18n/LangSwitch";
import { ROUTES } from "@/lib/constants";
import { getT } from "@/lib/i18n/server";

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 pb-16 pt-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Logo height={36} />
        <div className="flex items-center gap-3">
          <LangSwitch />
          <Link href={ROUTES.home} className="text-sm font-medium text-piedra underline">
            {t("← Volver")}
          </Link>
        </div>
      </div>
      <article className="space-y-4 text-[15px] leading-relaxed text-piedra-deep [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ladrillo-deep [&_li]:ml-5 [&_li]:list-disc [&_a]:font-semibold [&_a]:text-ladrillo-deep [&_a]:underline">
        {children}
      </article>
      <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-lino pt-4 text-sm text-piedra">
        <Link href={ROUTES.privacidad} className="underline">{t("Política de privacidad")}</Link>
        <Link href={ROUTES.terminos} className="underline">{t("Términos de uso")}</Link>
        <Link href={ROUTES.cookies} className="underline">{t("Cookies")}</Link>
      </nav>
    </main>
  );
}
