import { MONTH_NAMES_ES } from "@/lib/date";

/**
 * Gráfico de barras simple con flexbox (sin SVG estirado, así los meses no se
 * "aplastan"). Scrollea en horizontal si hay muchos meses.
 */
export function BarChart({
  data,
  height = 160,
}: {
  data: { ym: string; value: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-piedra">Sin datos todavía.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-stretch gap-2" style={{ height, minWidth: data.length * 34 }}>
        {data.map((d) => {
          const pct = (d.value / max) * 100;
          const label = MONTH_NAMES_ES[Number(d.ym.slice(5, 7)) - 1].slice(0, 3);
          const isCurrent = d.ym === data[data.length - 1]?.ym;
          return (
            <div key={d.ym} className="flex flex-1 flex-col items-center" style={{ minWidth: 26 }}>
              <div className="flex w-full flex-1 flex-col justify-end">
                <span className="mb-1 text-center text-[11px] font-semibold text-piedra-deep">
                  {d.value || ""}
                </span>
                <div
                  className={`w-full rounded-t-md ${isCurrent ? "bg-ladrillo" : "bg-miel"}`}
                  style={{ height: `${Math.max(pct, 3)}%` }}
                />
              </div>
              <span className="mt-1.5 text-[11px] capitalize text-piedra">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
