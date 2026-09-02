type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, string> = {
  info: "border-piedra/30 bg-piedra/5 text-piedra-deep",
  success: "border-miel-deep/40 bg-miel/15 text-piedra-deep",
  warning: "border-miel-deep/50 bg-miel/25 text-piedra-deep",
  error: "border-ladrillo/40 bg-ladrillo/10 text-ladrillo-deep",
};

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm ${tones[tone]} ${className}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}
