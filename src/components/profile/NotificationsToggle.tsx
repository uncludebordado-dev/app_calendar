"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { setNotificationsAction } from "@/app/(app)/mi-perfil/actions";

export function NotificationsToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();

  function change(v: boolean) {
    setOn(v);
    start(async () => {
      const res = await setNotificationsAction(v);
      if (!res.ok) setOn(!v);
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-piedra-deep">Recibir avisos por email</p>
        <p className="text-xs text-piedra">
          Confirmaciones de reserva y recordatorios de clase.
        </p>
      </div>
      <Toggle checked={on} onChange={change} disabled={pending} label="Notificaciones por email" />
    </div>
  );
}
