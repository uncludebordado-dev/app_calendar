import Image from "next/image";
import Link from "next/link";

/** Proporción real de public/logo.png (wordmark bordado, fondo transparente). */
const LOGO_W = 600;
const LOGO_H = 420;
const RATIO = LOGO_W / LOGO_H;

/**
 * Marca del emprendimiento. Para cambiarla, reemplazá public/logo.png
 * (y actualizá LOGO_W / LOGO_H con las dimensiones nuevas).
 *
 * Pasá `height` para fijar la altura (útil en barras); o `width` para el ancho.
 */
export function Logo({
  width,
  height,
  href = "/",
  priority = false,
  className = "",
}: {
  width?: number;
  height?: number;
  href?: string | null;
  priority?: boolean;
  className?: string;
}) {
  const h = height ?? Math.round((width ?? 160) / RATIO);
  const w = width ?? Math.round(h * RATIO);

  const img = (
    <Image
      src="/logo.png"
      alt="un clu de bordado"
      width={w}
      height={h}
      priority={priority}
      className="select-none"
      style={{ height: h, width: "auto" }}
    />
  );

  if (!href) return <span className={className}>{img}</span>;

  return (
    <Link href={href} className={`inline-flex ${className}`} aria-label="un clu de bordado — inicio">
      {img}
    </Link>
  );
}
