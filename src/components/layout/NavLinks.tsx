"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

const links = [
  { href: ROUTES.calendario, label: "Calendario" },
  { href: ROUTES.misReservas, label: "Mis reservas" },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...links, { href: ROUTES.admin, label: "Admin" }] : links;

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Principal">
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
              active ? "bg-miel/40 text-piedra-deep" : "text-piedra hover:bg-lino-soft"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
