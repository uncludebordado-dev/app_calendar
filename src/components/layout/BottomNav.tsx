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
} from "./icons";

type Item = { href: string; label: string; icon: (p: { className?: string }) => React.ReactNode };

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const left: Item[] = [
    { href: ROUTES.calendario, label: "Calendario", icon: CalendarIcon },
    { href: ROUTES.misReservas, label: "Reservas", icon: TicketIcon },
  ];
  const right: Item[] = [
    { href: "/chat", label: "Chat", icon: ChatIcon },
    { href: ROUTES.miPerfil, label: "Perfil", icon: UserIcon },
  ];
  if (isAdmin) right.push({ href: ROUTES.admin, label: "Admin", icon: ToolIcon });

  // El botón central lleva a la acción rápida (reservar / nueva franja).
  const centerHref = isAdmin ? "/admin/franjas/nueva" : ROUTES.calendario;

  const isActive = (href: string) =>
    href === ROUTES.calendario
      ? pathname === href || pathname.startsWith("/calendario")
      : pathname === href || pathname.startsWith(`${href}/`);

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

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-lino bg-crema/90 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {left.map((it) => (
          <Tab key={it.href} {...it} />
        ))}

        <div className="flex w-16 shrink-0 items-start justify-center">
          <Link
            href={centerHref}
            aria-label={isAdmin ? "Nueva franja" : "Reservar una clase"}
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
