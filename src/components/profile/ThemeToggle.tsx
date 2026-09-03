"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const options = [
  { value: "light", label: "Claro", icon: "☀︎" },
  { value: "dark", label: "Oscuro", icon: "☾" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "light" : "light";

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-piedra-deep">Tema</p>
        <p className="text-xs text-piedra">Elegí cómo se ve la app.</p>
      </div>
      <div className="flex gap-1 rounded-xl border border-lino p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            aria-pressed={current === o.value}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              current === o.value
                ? "bg-miel/40 text-piedra-deep"
                : "text-piedra hover:bg-lino-soft"
            }`}
          >
            <span aria-hidden className="mr-1">{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
