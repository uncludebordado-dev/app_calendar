import { setKitOrderStatusAction } from "@/app/admin/kits/actions";
import { formatPhoneForDisplay } from "@/lib/phone";
import type { AdminKitOrderRow } from "@/types/database.types";

type Status = AdminKitOrderRow["status"];

const STATUS_LABEL: Record<Status, string> = {
  pendiente: "Pendiente",
  contactada: "Contactada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

const STATUS_STYLE: Record<Status, string> = {
  pendiente: "bg-ladrillo/15 text-ladrillo-deep",
  contactada: "bg-miel/40 text-piedra-deep",
  entregada: "bg-green-100 text-green-800",
  cancelada: "bg-lino-soft text-piedra",
};

const NEXT_ACTIONS: Record<Status, { status: Status; label: string }[]> = {
  pendiente: [
    { status: "contactada", label: "Ya la contacté" },
    { status: "entregada", label: "Entregada" },
    { status: "cancelada", label: "Cancelar" },
  ],
  contactada: [
    { status: "entregada", label: "Entregada" },
    { status: "cancelada", label: "Cancelar" },
  ],
  entregada: [{ status: "pendiente", label: "Volver a pendiente" }],
  cancelada: [{ status: "pendiente", label: "Volver a pendiente" }],
};

function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(iso));
}

function OrderCard({ order, kitName }: { order: AdminKitOrderRow; kitName: string }) {
  const digits = order.phone_e164.replace(/\D/g, "");
  return (
    <li className="card space-y-2 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-piedra-deep">{order.full_name}</p>
          <p className="text-xs capitalize text-piedra">{whenLabel(order.created_at)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <p className="font-medium text-piedra-deep">
        {kitName} × {order.quantity}
      </p>
      {order.note && (
        <p className="rounded-lg bg-lino-soft px-2.5 py-1.5 text-xs text-piedra-deep">Nota: {order.note}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <a href={`tel:${order.phone_e164}`} className="font-medium text-ladrillo-deep underline">
          {formatPhoneForDisplay(order.phone_e164)}
        </a>
        <a
          href={`https://wa.me/${digits}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ladrillo-deep underline"
        >
          WhatsApp
        </a>
        <a href={`mailto:${order.email}`} className="break-all font-medium text-ladrillo-deep underline">
          {order.email}
        </a>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-lino pt-2">
        {NEXT_ACTIONS[order.status].map((a) => (
          <form key={a.status} action={setKitOrderStatusAction}>
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="status" value={a.status} />
            <button
              type="submit"
              className="rounded-lg border border-lino px-3 py-1.5 text-xs font-semibold text-piedra-deep hover:bg-lino-soft"
            >
              {a.label}
            </button>
          </form>
        ))}
      </div>
    </li>
  );
}

export function KitOrders({
  orders,
  kitNames,
}: {
  orders: AdminKitOrderRow[];
  kitNames: Record<string, string>;
}) {
  const open = orders.filter((o) => o.status === "pendiente" || o.status === "contactada");
  const closed = orders.filter((o) => o.status === "entregada" || o.status === "cancelada");
  const pending = orders.filter((o) => o.status === "pendiente").length;
  const nameOf = (o: AdminKitOrderRow) => kitNames[o.kit] ?? o.kit;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-piedra-deep">
          Pedidos de kits
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-ladrillo px-2 py-0.5 align-middle text-xs font-semibold text-white">
              {pending} pendiente{pending === 1 ? "" : "s"}
            </span>
          )}
        </h2>
        <p className="mt-0.5 text-xs text-piedra">
          Lo que las alumnas reservaron, con sus datos de contacto. El pago se hace en persona.
        </p>
      </div>

      {open.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lino px-4 py-6 text-center text-sm text-piedra">
          No hay pedidos por atender.
        </p>
      ) : (
        <ul className="space-y-2">
          {open.map((o) => (
            <OrderCard key={o.id} order={o} kitName={nameOf(o)} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-piedra-deep">
            Historial ({closed.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {closed.map((o) => (
              <OrderCard key={o.id} order={o} kitName={nameOf(o)} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
