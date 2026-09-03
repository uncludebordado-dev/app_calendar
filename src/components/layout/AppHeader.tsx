import { Logo } from "./Logo";

/** Cabecera del área logueada: sólo el logo, centrado. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-lino bg-crema/85 backdrop-blur">
      <div className="flex h-14 items-center justify-center px-4">
        <Logo width={104} href="/calendario" />
      </div>
    </header>
  );
}
