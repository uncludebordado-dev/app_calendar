import { z } from "zod";
import { MAX_CAPACITY } from "@/lib/constants";
import { sanitizeMultiline } from "@/lib/sanitize";
import { todayKey } from "@/lib/date";

const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const slotSchema = z
  .object({
    classDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
      .refine((d) => d >= todayKey(), "La fecha no puede ser en el pasado"),
    startTime: z.string().regex(timeRe, "Hora inicio inválida (HH:MM)"),
    endTime: z.string().regex(timeRe, "Hora fin inválida (HH:MM)"),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Mínimo 1 cupo")
      .max(MAX_CAPACITY, `Máximo ${MAX_CAPACITY} cupos`),
    notes: z
      .string()
      .max(500)
      .optional()
      .transform((v) => {
        const clean = sanitizeMultiline(v ?? "");
        return clean.length ? clean : undefined;
      }),
    isPublished: z.boolean().default(true),
  })
  .strict()
  .refine((v) => v.endTime > v.startTime, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["endTime"],
  });

export type SlotInput = z.input<typeof slotSchema>;
export type SlotValues = z.output<typeof slotSchema>;
