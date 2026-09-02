import Link from "next/link";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { signOutAction } from "@/app/(auth)/actions";
import type { Profile } from "@/types/database.types";

export function SiteHeader({ profile }: { profile: Profile }) {
  const isAdmin = profile.role === "admin";
  const firstName = profile.full_name.split(" ")[0] || "vos";

  return (
    <header className="sticky top-0 z-20 border-b border-lino bg-crema/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Logo size={44} />
        <NavLinks isAdmin={isAdmin} />
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg px-2 py-1 text-xs font-medium text-piedra hover:bg-lino-soft"
            title={`Cerrar sesión de ${firstName}`}
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mx-auto max-w-3xl px-4 py-10 text-center text-xs text-piedra-soft">
      <Link href="https://instagram.com/uncludebordado" className="underline">
        @uncludebordado
      </Link>{" "}
      · Hecho con hilo y código.
    </footer>
  );
}
