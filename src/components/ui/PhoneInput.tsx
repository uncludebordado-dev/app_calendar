"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

const PRIORITY: CountryCode[] = [
  "ES", "AR", "UY", "CL", "MX", "CO", "PE", "BR", "US", "IT", "FR", "DE", "GB", "PT",
];

let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(["es"], { type: "region" });
} catch {
  displayNames = null;
}

function countryLabel(c: CountryCode): string {
  const name = displayNames?.of(c) ?? c;
  return `${name} (+${getCountryCallingCode(c)})`;
}

interface Props {
  label: string;
  value: string; // E.164 o ""
  onChange: (e164: string) => void;
  error?: string;
  hint?: string;
}

export function PhoneInput({ label, value, onChange, error, hint }: Props) {
  const fieldId = useId();
  const errorId = `${fieldId}-err`;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const parsed = useMemo(() => (value ? parsePhoneNumberFromString(value) : undefined), [value]);
  const [country, setCountry] = useState<CountryCode>(
    (parsed?.country as CountryCode) ?? "ES",
  );
  const [national, setNational] = useState<string>(parsed?.nationalNumber?.toString() ?? "");

  const options = useMemo(() => {
    const all = getCountries();
    const rest = all
      .filter((c) => !PRIORITY.includes(c))
      .sort((a, b) =>
        (displayNames?.of(a) ?? a).localeCompare(displayNames?.of(b) ?? b, "es"),
      );
    return [...PRIORITY.filter((c) => all.includes(c)), ...rest];
  }, []);

  function emit(nextCountry: CountryCode, nextNational: string) {
    const digits = nextNational.replace(/[^\d]/g, "");
    if (!digits) return onChange("");
    const attempt = parsePhoneNumberFromString(digits, nextCountry);
    onChange(attempt?.number ?? `+${getCountryCallingCode(nextCountry)}${digits}`);
  }

  return (
    <div>
      <label htmlFor={fieldId} className="field-label">
        {label}
      </label>

      {mounted ? (
        <div className="flex gap-2">
          <select
            aria-label="Código de país"
            value={country}
            onChange={(e) => {
              const c = e.target.value as CountryCode;
              setCountry(c);
              emit(c, national);
            }}
            className="field-input w-[44%] shrink-0 px-2"
          >
            {options.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c)}
              </option>
            ))}
          </select>
          <input
            id={fieldId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="600 000 000"
            value={national}
            onChange={(e) => {
              const n = e.target.value.replace(/[^\d\s]/g, "");
              setNational(n);
              emit(country, n);
            }}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className="field-input flex-1"
          />
        </div>
      ) : (
        <input
          id={fieldId}
          type="tel"
          inputMode="tel"
          placeholder="+34 600 000 000"
          defaultValue={value}
          className="field-input"
          readOnly
        />
      )}

      {hint && !error && <p className="mt-1 text-xs text-piedra">{hint}</p>}
      {error && (
        <p id={errorId} className="field-error">
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
