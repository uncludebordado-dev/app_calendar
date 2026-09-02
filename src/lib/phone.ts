import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/** País por defecto para números escritos sin código internacional. */
export const DEFAULT_COUNTRY: CountryCode = "AR";

export interface PhoneParseResult {
  valid: boolean;
  e164?: string;
  formatted?: string;
}

/**
 * Valida y normaliza un teléfono a formato E.164 (+<código país><número>).
 * Acepta el número con o sin `+`; si no trae código de país usa AR.
 */
export function parsePhone(input: string): PhoneParseResult {
  const raw = input.trim();
  if (!raw) return { valid: false };

  const phone = parsePhoneNumberFromString(
    raw,
    raw.startsWith("+") ? undefined : DEFAULT_COUNTRY,
  );

  if (!phone || !phone.isValid()) return { valid: false };

  return {
    valid: true,
    e164: phone.number, // ya en E.164
    formatted: phone.formatInternational(),
  };
}

export function formatPhoneForDisplay(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  return phone?.formatInternational() ?? e164;
}
