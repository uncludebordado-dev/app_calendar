import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { resetStrikesAction } from "@/app/admin/actions";
import { STRIKE_BLOCK_THRESHOLD } from "@/lib/constants";
import type { AdminStudentRow } from "@/types/database.types";

export default async function AdminAlumnasPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_students");
  const students = (data ?? []) as AdminStudentRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alumnas</h1>
          <p className="mt-1 text-sm text-piedra">
            {students.length} registradas · bloqueo automático a las {STRIKE_BLOCK_THRESHOLD} sanciones
          </p>
        </div>
        <Link href="/admin" className="text-sm text-piedra underline">
          ← Franjas
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no hay alumnas registradas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-lino text-left text-xs uppercase tracking-wide text-piedra">
                <th className="py-2 pr-3 font-semibold">Nombre</th>
                <th className="py-2 pr-3 font-semibold">Contacto</th>
                <th className="py-2 pr-3 font-semibold">Clases</th>
                <th className="py-2 pr-3 font-semibold">Sanciones</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-lino/60 align-top">
                  <td className="py-2.5 pr-3 font-medium text-piedra-deep">
                    {s.full_name}
                    {s.blocked && (
                      <span className="ml-2 rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                        Bloqueada
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs">
                    <a href={`tel:${s.phone_e164}`} className="block text-ladrillo-deep underline">
                      {s.phone_e164 ? formatPhoneForDisplay(s.phone_e164) : "—"}
                    </a>
                    <a href={`mailto:${s.email}`} className="block text-ladrillo-deep underline">
                      {s.email}
                    </a>
                  </td>
                  <td className="py-2.5 pr-3">
                    {s.confirmed_count} ok · {s.cancelled_count} baja
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={
                        s.strikes > 0
                          ? "font-semibold text-ladrillo-deep"
                          : "text-piedra"
                      }
                    >
                      {s.strikes}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {s.strikes > 0 || s.blocked ? (
                      <form action={resetStrikesAction} className="flex justify-end">
                        <input type="hidden" name="userId" value={s.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-lino px-2.5 py-1 text-xs font-medium text-piedra hover:bg-lino-soft"
                        >
                          Perdonar sanciones
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
