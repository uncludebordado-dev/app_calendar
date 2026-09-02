"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { slotSchema, type SlotInput } from "@/lib/validation/slot";
import {
  createSlotAction,
  updateSlotAction,
  type AdminActionResult,
} from "@/app/admin/actions";
import { Field } from "@/components/ui/Field";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { MAX_CAPACITY } from "@/lib/constants";

const initial: AdminActionResult = { ok: false };

interface Props {
  mode: "create" | "edit";
  slotId?: string;
  defaultValues?: Partial<SlotInput>;
  bookedCount?: number;
}

export function SlotForm({ mode, slotId, defaultValues, bookedCount = 0 }: Props) {
  const action = mode === "create" ? createSlotAction : updateSlotAction;
  const [state, formAction, pending] = useActionState(action, initial);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SlotInput>({
    resolver: zodResolver(slotSchema),
    mode: "onTouched",
    defaultValues: {
      capacity: MAX_CAPACITY,
      isPublished: true,
      ...defaultValues,
    },
  });

  function onValid(_: SlotInput, event?: React.BaseSyntheticEvent) {
    const form = event?.target as HTMLFormElement | undefined;
    if (form) formAction(new FormData(form));
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="card space-y-4 p-5">
      {mode === "edit" && slotId && <input type="hidden" name="id" value={slotId} />}

      <Field label="Fecha" type="date" error={errors.classDate?.message} {...register("classDate")} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde" type="time" error={errors.startTime?.message} {...register("startTime")} />
        <Field label="Hasta" type="time" error={errors.endTime?.message} {...register("endTime")} />
      </div>

      <Field
        label={`Cupo (máx. ${MAX_CAPACITY})`}
        type="number"
        min={Math.max(1, bookedCount)}
        max={MAX_CAPACITY}
        hint={bookedCount > 0 ? `Ya hay ${bookedCount} reserva(s) confirmada(s).` : undefined}
        error={errors.capacity?.message}
        {...register("capacity")}
      />

      <div>
        <label htmlFor="notes" className="field-label">
          Tema de la clase <span className="font-normal text-piedra">(opcional)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          className="field-input"
          maxLength={500}
          placeholder="Puntada margarita, iniciales, bordado libre…"
          {...register("notes")}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-lino text-ladrillo focus:ring-ladrillo"
          {...register("isPublished")}
        />
        Visible para las alumnas
      </label>

      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={pending}>
          {mode === "create" ? "Crear franja" : "Guardar cambios"}
        </Button>
        <ButtonLink href="/admin" variant="ghost">
          Cancelar
        </ButtonLink>
      </div>
    </form>
  );
}
