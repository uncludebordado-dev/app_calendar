import { Logo } from "./Logo";

/** Cabecera del área logueada: sólo el logo, centrado, con aire alrededor. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-lino bg-crema/85 backdrop-blur">
      <div className="flex items-center justify-center px-4 py-3.5">
        <Logo height={34} href="/" />
      </div>
    </header>
  );
}
