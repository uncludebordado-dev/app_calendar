"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/franjas", label: "Franjas" },
  { href: "/admin/reservas", label: "Inscriptas" },
  { href: "/admin/alumnas", label: "Alumnas" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-lino bg-surface p-1 text-sm">
      {tabs.map(({ href, label }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-colors ${
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
