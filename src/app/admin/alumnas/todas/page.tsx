import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { formatLongDate } from "@/lib/date";
import type { AdminStudentRow } from "@/types/database.types";

export const metadata: Metadata = { title: "Todas las alumnas — un clu de bordado" };

function firstLetter(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return /[A-ZÁÉÍÓÚÑ]/.test(c) ? c : "#";
}

export default async function TodasLasAlumnasPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_students");

  const rows = ((data ?? []) as AdminStudentRow[])
    .slice()
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es", { sensitivity: "base" }));

  // Agrupar por inicial para separadores A-Z.
  const groups: { letter: string; items: AdminStudentRow[] }[] = [];
  for (const r of rows) {
    const l = firstLetter(r.full_name);
    const g = groups[groups.length - 1];
    if (g && g.letter === l) g.items.push(r);
    else groups.push({ letter: l, items: [r] });
  }

  return (
    <div className="space-y-4">
      <Link href="/admin/alumnas" className="text-sm text-piedra underline">
        ← Volver al desglose del mes
      </Link>

      <div>
        <h1 className="text-xl font-semibold">Todas las alumnas</h1>
        <p className="mt-1 text-sm text-piedra">
          {rows.length} inscripta{rows.length === 1 ? "" : "s"} en el club, de la A a la Z. Tocá un
          nombre para ver su perfil, sus pagos y sus clases.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-dashed border-ladrillo/40 bg-ladrillo/5 px-4 py-8 text-center text-sm text-ladrillo-deep">
          No se pudo cargar el listado. Actualizá la página.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no hay alumnas registradas.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.letter}>
              <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-piedra-soft">
                {g.letter}
              </p>
              <ul className="card divide-y divide-lino p-0">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/alumnas/${s.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-lino-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-piedra-deep">
                          {s.full_name}
                          {s.blocked && (
                            <span className="ml-2 align-middle text-[11px] font-medium text-ladrillo-deep">
                              bloqueada
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-piedra">
                          Desde el <span className="first-letter:uppercase">{formatLongDate(String(s.created_at).slice(0, 10))}</span>
                        </span>
                      </span>
                      <span aria-hidden className="shrink-0 text-piedra-soft">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
