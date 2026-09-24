"use client";

import { useEffect, useState } from "react";
import { subscribeToPushAction } from "@/app/(app)/news/actions";
import { useT } from "@/components/i18n/LangProvider";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const DISMISS_KEY = "clu-push-dismissed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "hidden" | "offer" | "asking" | "on" | "unsupported" | "error" | "denied";

export function PushOptIn() {
  const { t } = useT();
  const [status, setStatus] = useState<Status>("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      return;
    }
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* ignore */
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    (async () => {
      if (Notification.permission === "granted") {
        // Ya tiene permiso: confirmamos que la suscripción sigue activa.
        try {
          const reg = await navigator.serviceWorker.ready;
          const existing = await reg.pushManager.getSubscription();
          if (existing) setStatus("on");
          else setStatus("offer");
        } catch {
          setStatus("offer");
        }
        return;
      }
      setStatus("offer");
    })();
  }, []);

  async function activate() {
    setStatus("asking");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("offer");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));
      const json = sub.toJSON();
      const res = await subscribeToPushAction({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setStatus(res.ok ? "on" : "error");
    } catch {
      setStatus("error");
    }
  }

  function dismiss() {
    setStatus("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (status === "hidden" || status === "on" || status === "unsupported") return null;

  if (status === "denied") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-lino bg-surface p-3 text-xs">
        <span className="text-piedra">
          {t("Las notificaciones están bloqueadas en este navegador. Activalas desde la configuración del sitio para enterarte de las novedades.")}
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("Cerrar")}
          className="shrink-0 rounded-full px-2 py-1.5 text-piedra hover:text-piedra-deep"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-lino bg-surface p-3 text-xs">
      <span className="text-piedra">
        {status === "error"
          ? t("No se pudo activar. Probá desde el celular, con la app instalada.")
          : t("Activá las notificaciones para enterarte apenas se publica algo nuevo.")}
      </span>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={activate}
          disabled={status === "asking"}
          className="rounded-full bg-ladrillo px-3 py-1.5 font-semibold text-white disabled:opacity-50"
        >
          {status === "asking" ? t("Activando…") : t("Activar")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("Cerrar")}
          className="rounded-full px-2 py-1.5 text-piedra hover:text-piedra-deep"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
