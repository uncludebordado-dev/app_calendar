import { createClient } from "@/lib/supabase/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { resetStrikesAction, deletePaymentAction } from "@/app/admin/actions";
import { PaymentForm } from "@/components/admin/PaymentForm";
import { STRIKE_BLOCK_THRESHOLD } from "@/lib/constants";
import type { AdminStudentRow, Payment } from "@/types/database.types";

export const metadata = { title: "Alumnas — un clu de bordado" };

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const methodLabel: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  otro: "Otro",
};

export default async function AdminAlumnasPage() {
  const supabase = await createClient();
  const [{ data: studentsData }, { data: paymentsData }] = await Promise.all([
    supabase.rpc("admin_list_students"),
    supabase.from("payments").select("*").order("paid_on", { ascending: false }),
  ]);

  const students = (studentsData ?? []) as AdminStudentRow[];
  const payments = (paymentsData ?? []) as Payment[];
  const paymentsByUser = new Map<string, Payment[]>();
  for (const p of payments) {
    if (!paymentsByUser.has(p.user_id)) paymentsByUser.set(p.user_id, []);
    paymentsByUser.get(p.user_id)!.push(p);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Alumnas</h1>
        <p className="mt-1 text-sm text-piedra">
          {students.length} registradas · bloqueo automático a las {STRIKE_BLOCK_THRESHOLD}{" "}
          sanciones
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-10 text-center text-sm text-piedra">
          Todavía no hay alumnas registradas.
        </p>
      ) : (
        <ul className="space-y-3">
          {students.map((s) => {
            const hist = paymentsByUser.get(s.id) ?? [];
            const totalPaid = hist.reduce((n, p) => n + (p.amount ?? 0), 0);
            return (
              <li key={s.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-piedra-deep">
                      {s.full_name}
                      {s.blocked && (
                        <span className="ml-2 rounded-full bg-ladrillo/10 px-2 py-0.5 text-xs text-ladrillo-deep">
                          Bloqueada
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <a href={`tel:${s.phone_e164}`} className="text-ladrillo-deep underline">
                        {s.phone_e164 ? formatPhoneForDisplay(s.phone_e164) : "—"}
                      </a>
                      <span className="mx-1 text-piedra-soft">·</span>
                      <a href={`mailto:${s.email}`} className="text-ladrillo-deep underline">
                        {s.email}
                      </a>
                    </p>
                    <p className="mt-0.5 text-xs text-piedra">
                      {s.confirmed_count} reservas · {s.cancelled_count} bajas ·{" "}
                      {s.strikes > 0 ? (
                        <b className="text-ladrillo-deep">{s.strikes} sanciones</b>
                      ) : (
                        "sin sanciones"
                      )}
                    </p>
                  </div>

                  {(s.strikes > 0 || s.blocked) && (
                    <form action={resetStrikesAction}>
                      <input type="hidden" name="userId" value={s.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-lino px-2.5 py-1 text-xs font-medium text-piedra hover:bg-lino-soft"
                      >
                        Perdonar sanciones
                      </button>
                    </form>
                  )}
                </div>

                {/* Pagos */}
                <div className="mt-3 border-t border-lino pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-piedra-deep">
                      Pagos {hist.length > 0 && `· total ${money.format(totalPaid)}`}
                    </p>
                    <PaymentForm userId={s.id} studentName={s.full_name} compact />
                  </div>

                  {hist.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-piedra">
                      {hist.slice(0, 6).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>
                            {p.paid_on} ·{" "}
                            {p.amount != null ? money.format(p.amount) : "(sin monto)"} ·{" "}
                            {methodLabel[p.method] ?? p.method}
                            {p.note ? ` · ${p.note}` : ""}
                          </span>
                          <form action={deletePaymentAction}>
                            <input type="hidden" name="paymentId" value={p.id} />
                            <button
                              type="submit"
                              className="text-ladrillo-deep hover:underline"
                              title="Eliminar pago"
                            >
                              ✕
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
