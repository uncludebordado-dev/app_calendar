"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "clu-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS/iPadOS Safari no dispara beforeinstallprompt.
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setHidden(false);
    }

    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!deferred && !iosHint)) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setHidden(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-lino/70 bg-crema/95 px-4 py-3 shadow-soft backdrop-blur-xl">
        <span aria-hidden className="text-lg">📌</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-piedra-deep">Instalá la app</p>
          <p className="text-xs text-piedra">
            {iosHint
              ? "Tocá Compartir y luego «Añadir a inicio»."
              : "Sumá el clu a tu pantalla de inicio."}
          </p>
        </div>
        {deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-full bg-ladrillo px-3 py-1.5 text-xs font-semibold text-white"
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 rounded-full px-2 py-1 text-piedra hover:text-piedra-deep"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
