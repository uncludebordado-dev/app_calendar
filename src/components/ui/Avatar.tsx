function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        style={dim}
        className={`shrink-0 rounded-full border border-lino object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...dim, fontSize: Math.round(size * 0.38) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-miel/40 font-semibold text-piedra-deep ${className}`}
    >
      {initials(name)}
    </span>
  );
}
