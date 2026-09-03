"use client";

import { useEffect, useRef, useState } from "react";
import { isUnlocked, markUnlocked, pinIsSet, verifyPin } from "@/lib/pin";
import { Logo } from "@/components/layout/Logo";

/** Muestra una pantalla de PIN si el dispositivo tiene bloqueo activado. */
export function AppLock() {
  const [locked, setLocked] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pinIsSet() && !isUnlocked()) setLocked(true);
  }, []);

  useEffect(() => {
    if (locked) inputRef.current?.focus();
  }, [locked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await verifyPin(value)) {
      markUnlocked();
      setLocked(false);
      setValue("");
    } else {
      setError(true);
      setValue("");
    }
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-crema px-6">
      <Logo width={160} href={null} />
      <p className="mt-6 text-sm text-piedra">Ingresá tu PIN para continuar</p>

      <form onSubmit={submit} className="mt-4 w-full max-w-[220px]">
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={8}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ""));
            setError(false);
          }}
          aria-label="PIN"
          aria-invalid={error}
          className="field-input text-center text-2xl tracking-[0.4em]"
        />
        {error && (
          <p role="alert" className="mt-2 text-center text-sm text-ladrillo-deep">
            PIN incorrecto
          </p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-ladrillo px-4 py-3 text-sm font-semibold text-white"
        >
          Desbloquear
        </button>
      </form>
    </div>
  );
}
