import Image from "next/image";
import Link from "next/link";

/** Proporción real de public/logo.png (wordmark bordado, fondo transparente). */
const LOGO_W = 600;
const LOGO_H = 420;

/**
 * Marca del emprendimiento. Para cambiarla, reemplazá public/logo.png
 * (y actualizá LOGO_W / LOGO_H con las dimensiones nuevas).
 */
export function Logo({
  width = 160,
  href = "/",
  priority = false,
  className = "",
}: {
  width?: number;
  href?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const height = Math.round((width * LOGO_H) / LOGO_W);

  const img = (
    <Image
      src="/logo.png"
      alt="un clu de bordado"
      width={width}
      height={height}
      priority={priority}
      className="h-auto w-auto select-none"
      style={{ width, height: "auto" }}
    />
  );

  if (!href) return <span className={className}>{img}</span>;

  return (
    <Link href={href} className={`inline-flex ${className}`} aria-label="un clu de bordado — inicio">
      {img}
    </Link>
  );
}
