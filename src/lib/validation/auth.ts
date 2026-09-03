import { z } from "zod";
import { parsePhone } from "@/lib/phone";
import { sanitizeName } from "@/lib/sanitize";

// Contraseñas comunes que no aceptamos aunque tengan 8+ caracteres.
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "contrasena", "contraseña",
  "qwertyui", "qwerty123", "11111111", "00000000", "iloveyou", "admin123",
  "password1", "abc12345", "bordado123",
]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Ingresá tu email")
  .max(254)
  .email("Email inválido");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .refine((v) => !/^\s|\s$/.test(v), "No puede empezar ni terminar con espacios")
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), "Incluí al menos una letra y un número")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "Elegí una contraseña menos común");

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Ingresá tu nombre completo")
  .max(80)
  .transform(sanitizeName)
  .refine((v) => v.split(/\s+/).length >= 2, "Ingresá nombre y apellido");

export const phoneSchema = z
  .string()
  .trim()
  .min(6, "Ingresá tu teléfono")
  .max(25)
  .superRefine((value, ctx) => {
    const parsed = parsePhone(value);
    if (!parsed.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Teléfono inválido. Usá código de país + número, ej. +54 9 11 5555 5555",
      });
    }
  })
  .transform((value) => parsePhone(value).e164 as string);

export const signupSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Ingresá tu contraseña"),
  })
  .strict();

/** Fecha de nacimiento: opcional, formato YYYY-MM-DD, entre 5 y 100 años. */
export const birthDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "")
  .superRefine((value, ctx) => {
    if (!value) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Fecha inválida" });
      return;
    }
    const year = Number(value.slice(0, 4));
    const nowYear = new Date().getUTCFullYear();
    if (value > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "No puede ser en el futuro" });
    } else if (nowYear - year > 100 || nowYear - year < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Revisá el año" });
    }
  })
  .transform((v) => (v ? v : null));

export const completeProfileSchema = z
  .object({
    fullName: fullNameSchema,
    phone: phoneSchema,
    birthDate: birthDateSchema,
  })
  .strict();

export const editProfileSchema = completeProfileSchema;

export type SignupInput = z.input<typeof signupSchema>;
export type SignupValues = z.output<typeof signupSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type CompleteProfileInput = z.input<typeof completeProfileSchema>;
export type CompleteProfileValues = z.output<typeof completeProfileSchema>;
