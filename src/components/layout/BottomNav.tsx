"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import {
  CalendarIcon,
  ChartIcon,
  ChatIcon,
  SparkleIcon,
  TicketIcon,
  ToolIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode };

const shell =
  "fixed inset-x-0 bottom-0 z-30 border-t border-lino bg-crema/90 backdrop-blur pb-[env(safe-area-inset-bottom)]";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === ROUTES.calendario) return pathname.startsWith("/calendario");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const Tab = ({ href, label, icon: Icon }: Item) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
          active ? "text-ladrillo-deep" : "text-piedra hover:text-piedra-deep"
        }`}
      >
        <Icon className="h-[22px] w-[22px]" />
        <span className="leading-none">{label}</span>
      </Link>
    );
  };

  // ---- ADMIN: Calendario · Alumnas · Dashboard · Admin (sin "Mis reservas") ----
  if (isAdmin) {
    const items: Item[] = [
      { href: "/admin/calendario", label: "Calendario", icon: CalendarIcon },
      { href: "/admin/alumnas", label: "Alumnas", icon: UsersIcon },
      { href: "/admin", label: "Dashboard", icon: ChartIcon },
      { href: "/admin/perfil", label: "Admin", icon: ToolIcon },
    ];
    return (
      <nav aria-label="Navegación principal" className={shell}>
        <div className="mx-auto flex max-w-md items-stretch px-2">
          {items.map((it) => (
            <Tab key={it.href} {...it} />
          ))}
        </div>
      </nav>
    );
  }

  // ---- ALUMNA: Calendario · Reservas · (+) · Chat · Perfil ----
  const left: Item[] = [
    { href: ROUTES.calendario, label: "Calendario", icon: CalendarIcon },
    { href: ROUTES.misReservas, label: "Reservas", icon: TicketIcon },
  ];
  const right: Item[] = [
    { href: "/chat", label: "Chat", icon: ChatIcon },
    { href: ROUTES.miPerfil, label: "Perfil", icon: UserIcon },
  ];

  return (
    <nav aria-label="Navegación principal" className={shell}>
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {left.map((it) => (
          <Tab key={it.href} {...it} />
        ))}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <Link
            href={ROUTES.calendario}
            aria-label="Reservar una clase"
            className="-mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-ladrillo text-white shadow-soft ring-4 ring-crema transition-transform active:scale-95"
          >
            <SparkleIcon className="h-6 w-6" />
          </Link>
        </div>
        {right.map((it) => (
          <Tab key={it.href} {...it} />
        ))}
      </div>
    </nav>
  );
}
