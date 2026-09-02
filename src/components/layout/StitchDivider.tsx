/** Guarda decorativa: puntada corrida. Dibujo propio, no es el isotipo de la marca. */
export function StitchDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 12"
      className={`w-40 text-miel-deep ${className}`}
      fill="none"
      aria-hidden
    >
      <path
        d="M2 6h20M34 6h20M66 6h20M98 6h20M130 6h20M162 6h20M194 6h20M226 6h12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[14, 46, 78, 110, 142, 174, 206].map((x) => (
        <circle key={x} cx={x + 6} cy="6" r="1.6" fill="currentColor" className="text-ladrillo" />
      ))}
    </svg>
  );
}
