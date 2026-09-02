import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { StitchDivider } from "@/components/layout/StitchDivider";
import { INSTAGRAM_URL, ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "un clu de bordado",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <Logo size={220} href={null} priority className="drop-shadow-sm" />

      <StitchDivider className="mt-8" />

      <h1 className="mt-6 text-2xl font-semibold leading-snug">
        Un club para bordar
        <span className="block text-piedra">reuniones, hilo y comunidad</span>
      </h1>

      <p className="mt-3 text-sm text-piedra">
        Elegí el día que te queda cómodo y guardá tu lugar en la mesa. Grupos
        chicos, mate y bastidor.
      </p>

      <div className="mt-10 flex w-full flex-col gap-3">
        <ButtonLink href={ROUTES.calendario} size="lg" fullWidth className="tracking-wide">
          RESERVÁ TU CLASE
        </ButtonLink>
        <ButtonLink
          href={INSTAGRAM_URL}
          variant="ghost"
          size="lg"
          fullWidth
          className="tracking-wide"
        >
          ¡CONOCENOS!
        </ButtonLink>
      </div>

      <p className="mt-8 text-xs text-piedra-soft">
        @uncludebordado · Buenos Aires
      </p>
    </main>
  );
}
