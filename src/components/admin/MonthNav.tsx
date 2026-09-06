import Link from "next/link";
import { MONTH_NAMES_ES } from "@/lib/date";
import { isSeasonStart } from "@/lib/calendar";

export function MonthNav({
  year,
  month,
  basePath = "/admin",
}: {
  year: number;
  month: number; // 0-11
  basePath?: string;
}) {
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const atStart = isSeasonStart(year, month);

  return (
    <div className="flex items-center justify-between rounded-xl border border-lino bg-surface px-3 py-2">
      {atStart ? (
        <span
          className="rounded-lg px-2 py-1 text-piedra-soft/50"
          aria-hidden
          title="El sistema arranca en septiembre 2026"
        >
          ←
        </span>
      ) : (
        <Link
          href={`${basePath}?mes=${key(prev)}`}
          className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft"
          aria-label="Mes anterior"
        >
          ←
        </Link>
      )}

      <span className="text-sm font-semibold capitalize">
        {MONTH_NAMES_ES[month]} {year}
      </span>

      <Link
        href={`${basePath}?mes=${key(next)}`}
        className="rounded-lg px-2 py-1 text-piedra hover:bg-lino-soft"
        aria-label="Mes siguiente"
      >
        →
      </Link>
    </div>
  );
}
