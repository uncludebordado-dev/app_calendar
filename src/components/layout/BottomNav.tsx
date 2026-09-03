"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import {
  CalendarIcon,
  ChatIcon,
  SparkleIcon,
  TicketIcon,
  ToolIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode };

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === ROUTES.calendario) return pathname.startsWith("/calendario");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const left: Item[] = isAdmin
    ? [
        { href: "/admin/calendario", label: "Calendario", icon: CalendarIcon },
        { href: "/admin/alumnas", label: "Alumnas", icon: UsersIcon },
      ]
    : [
        { href: ROUTES.calendario, label: "Calendario", icon: CalendarIcon },
        { href: ROUTES.misReservas, label: "Reservas", icon: TicketIcon },
      ];

  const right: Item[] = isAdmin
    ? [
        { href: "/chat", label: "Chat", icon: ChatIcon },
        { href: "/admin", label: "Admin", icon: ToolIcon },
      ]
    : [
        { href: "/chat", label: "Chat", icon: ChatIcon },
        { href: ROUTES.miPerfil, label: "Perfil", icon: UserIcon },
      ];

  const fabHref = isAdmin ? "/admin/horarios/nueva" : ROUTES.calendario;
  const fabLabel = isAdmin ? "Agregar una clase" : "Reservar una clase";

  const Tab = ({ href, label, icon: Icon }: Item) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
          active ? "text-ladrillo-deep" : "text-piedra hover:text-piedra-deep"
        }`}
      >
        <Icon className="h-[22px] w-[22px]" />
        <span className="leading-none">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.25rem)] max-w-sm -translate-x-1/2"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-stretch rounded-full border border-lino/60 bg-crema/70 px-1 shadow-soft backdrop-blur-xl">
        {left.map((it) => (
          <Tab key={it.href} {...it} />
        ))}

        <div className="flex w-16 shrink-0 items-center justify-center">
          <Link
            href={fabHref}
            aria-label={fabLabel}
            className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-ladrillo text-white shadow-soft ring-4 ring-crema transition-transform active:scale-95"
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
