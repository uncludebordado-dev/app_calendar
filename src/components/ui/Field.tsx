import { forwardRef, useId } from "react";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Input accesible: label asociada, error con aria-describedby y aria-invalid. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className = "", ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        className="field-input"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined}
        {...props}
      />
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
});
