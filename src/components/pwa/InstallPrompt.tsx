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

    const onInstalled = () => setHidden(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
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
    <div
      className="relative z-50 w-full bg-ladrillo text-white shadow-soft"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      role="region"
      aria-label="Instalar la app"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-2.5">
        <span aria-hidden className="text-lg leading-none">🪡</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight">
            Instalá un clu de bordado
          </p>
          <p className="text-[11px] leading-tight text-white/85">
            {iosHint
              ? "Tocá Compartir y luego «Añadir a inicio»."
              : "Accedé más rápido desde tu pantalla de inicio."}
          </p>
        </div>
        {deferred && (
          <button
            onClick={install}
            className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ladrillo-deep"
          >
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 rounded-full p-1 text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
