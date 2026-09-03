import Link from "next/link";
import { forwardRef } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ladrillo focus-visible:ring-offset-2 focus-visible:ring-offset-crema disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-ladrillo text-white hover:bg-ladrillo-deep",
  secondary: "bg-miel text-piedra-deep hover:bg-miel-deep",
  ghost: "bg-transparent text-piedra-deep hover:bg-lino-soft border border-lino",
  danger: "bg-surface text-ladrillo-deep border border-ladrillo hover:bg-ladrillo/10",
};

const sizes: Record<Size, string> = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

type ButtonProps = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

type AnchorProps = CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { as: "link"; href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className = "", children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  href,
  ...props
}: Omit<AnchorProps, "as">) {
  const external = /^https?:\/\//.test(href);
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`;

  if (external) {
    return (
      <a href={href} className={classes} rel="noopener noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
