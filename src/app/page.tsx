import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { StitchDivider } from "@/components/layout/StitchDivider";
import { Faq } from "@/components/landing/Faq";
import { LangSwitch } from "@/components/i18n/LangSwitch";
import { getT } from "@/lib/i18n/server";
import { INSTAGRAM_URL, ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "un clu de bordado",
};

const CTA = "tracking-wide !py-[1.6dvh] !text-[clamp(13px,2dvh,16px)] shrink-0";

export default async function HomePage() {
  const { t } = await getT();
  return (
    <main
      data-landing
      className="relative mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-[2dvh] overflow-hidden px-6 py-[2dvh] text-center [&:has(#faq-list)_.hero]:hidden"
    >
      <LangSwitch className="fixed right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10" />

      <div className="hero flex shrink-0 flex-col items-center gap-[2dvh]">
        <Image
          src="/logo.png"
          alt="un clu de bordado"
          width={600}
          height={420}
          priority
          className="h-[22dvh] max-h-[240px] w-auto select-none"
        />
        <StitchDivider />
        <h1 className="text-[clamp(18px,3.4dvh,24px)] font-semibold leading-snug">
          {t("Un club para bordar, compartir y hacer red")}
        </h1>
        <p className="text-[clamp(11px,1.7dvh,14px)] text-piedra">
          {t("Elegí el día que te quede cómodo y guardá tu lugar en la mesa · Grupos reducidos")}
        </p>
      </div>

      <div className="flex min-h-0 w-full flex-col gap-[1.5dvh]">
        <ButtonLink href={ROUTES.calendario} size="lg" fullWidth className={`${CTA} cta-secondary`}>
          {t("RESERVÁ TU CLASE")}
        </ButtonLink>
        <ButtonLink href={INSTAGRAM_URL} variant="ghost" size="lg" fullWidth className={`${CTA} cta-secondary`}>
          {t("¡CONOCENOS!")}
        </ButtonLink>
        <Faq ctaClassName={CTA} />
      </div>

      <p className="shrink-0 text-[clamp(10px,1.5dvh,12px)] text-piedra-soft">
        @uncludebordado · Barcelona
      </p>
    </main>
  );
}
