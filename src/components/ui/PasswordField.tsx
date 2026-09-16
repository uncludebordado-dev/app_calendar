"use client";

import { forwardRef, useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/layout/icons";

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
}

/** Como Field, pero con un botón de "ojito" para mostrar/ocultar la contraseña. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, hint, id, className = "", ...props }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;
    const [visible, setVisible] = useState(false);

    return (
      <div className={className}>
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            className="field-input pr-11"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
              undefined
            }
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-piedra hover:text-piedra-deep"
          >
            {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        {hint && !error && (
          <p id={hintId} className="mt-1 text-xs text-piedra">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="field-error">
            <span aria-hidden>⚠</span>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
