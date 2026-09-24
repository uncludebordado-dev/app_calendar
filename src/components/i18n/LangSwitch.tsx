"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/config";
import { useT } from "./LangProvider";

const OPTIONS: { value: Lang; label: string; name: string }[] = [
  { value: "es", label: "ES", name: "Español" },
  { value: "ca", label: "CAT", name: "Català" },
];

export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang } = useT();
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Idioma / Idioma"
      className={`inline-flex gap-1 rounded-full border border-lino bg-surface p-0.5 text-xs ${className}`}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          title={o.name}
          aria-pressed={lang === o.value}
          onClick={() => choose(o.value)}
          className={`rounded-full px-3 py-1 font-semibold transition-colors ${
            lang === o.value ? "bg-ladrillo text-white" : "text-piedra hover:bg-lino-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
