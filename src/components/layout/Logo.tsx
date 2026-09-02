import Image from "next/image";
import Link from "next/link";

/**
 * Marca del emprendimiento: la foto del bastidor bordado (public/logo.png).
 * Para cambiarla, reemplazá ese archivo manteniendo el nombre.
 */
export function Logo({
  size = 72,
  href = "/",
  priority = false,
  className = "",
}: {
  size?: number;
  href?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const img = (
    <Image
      src="/logo.png"
      alt="un clu de bordado"
      width={size}
      height={size}
      priority={priority}
      className="h-auto w-auto select-none"
      style={{ width: size, height: "auto" }}
    />
  );

  if (!href) return <span className={className}>{img}</span>;

  return (
    <Link href={href} className={`inline-flex ${className}`} aria-label="un clu de bordado — inicio">
      {img}
    </Link>
  );
}
