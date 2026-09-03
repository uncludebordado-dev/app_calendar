"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { pinIsSet, removePin, setPin } from "@/lib/pin";

export function PinSettings() {
  const [enabled, setEnabled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const biometricSupported = mounted && "PublicKeyCredential" in window;

  useEffect(() => {
    setMounted(true);
    setEnabled(pinIsSet());
  }, []);

  async function save() {
    setMsg(null);
    if (!/^\d{4,8}$/.test(a)) return setMsg("El PIN debe tener entre 4 y 8 números.");
    if (a !== b) return setMsg("Los PIN no coinciden.");
    await setPin(a);
    setEnabled(true);
    setEditing(false);
    setA("");
    setB("");
    setMsg("PIN activado en este dispositivo.");
  }

  function toggle(v: boolean) {
    if (v) {
      setEditing(true);
    } else {
      removePin();
      setEnabled(false);
      setEditing(false);
      setMsg("Bloqueo desactivado.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-piedra-deep">Bloqueo con PIN</p>
          <p className="text-xs text-piedra">
            Pide un PIN al abrir la app en este dispositivo.
          </p>
        </div>
        <Toggle checked={enabled} onChange={toggle} label="Bloqueo con PIN" />
      </div>

      {editing && (
        <div className="space-y-2 rounded-xl border border-lino bg-lino-soft/40 p-3">
          <input
            type="password"
            inputMode="numeric"
            placeholder="Nuevo PIN (4 a 8 números)"
            value={a}
            onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
            className="field-input"
            maxLength={8}
          />
          <input
            type="password"
            inputMode="numeric"
            placeholder="Repetí el PIN"
            value={b}
            onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
            className="field-input"
            maxLength={8}
          />
          <div className="flex gap-2">
            <Button type="button" size="md" onClick={save}>
              Guardar PIN
            </Button>
            <Button type="button" size="md" variant="ghost" onClick={() => { setEditing(false); setEnabled(pinIsSet()); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {msg && <Alert tone="info">{msg}</Alert>}

      <div className="flex items-center justify-between opacity-60">
        <div>
          <p className="font-medium text-piedra-deep">Ingreso con huella</p>
          <p className="text-xs text-piedra">
            {biometricSupported
              ? "Disponible próximamente (passkeys)."
              : "Este dispositivo no lo soporta."}
          </p>
        </div>
        <Toggle checked={false} onChange={() => {}} disabled label="Ingreso con huella" />
      </div>
    </div>
  );
}
