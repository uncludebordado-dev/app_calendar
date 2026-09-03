import { MONTH_NAMES_ES } from "@/lib/date";

export function BarChart({
  data,
  height = 140,
}: {
  data: { ym: string; value: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-piedra">Sin datos todavía.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / data.length;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 22);
        const x = i * barW;
        const label = MONTH_NAMES_ES[Number(d.ym.slice(5, 7)) - 1].slice(0, 3);
        return (
          <g key={d.ym}>
            <rect
              x={x + barW * 0.18}
              y={height - 18 - h}
              width={barW * 0.64}
              height={Math.max(h, 1)}
              rx="1"
              fill="rgb(var(--accent))"
            />
            <text
              x={x + barW / 2}
              y={height - 18 - h - 3}
              textAnchor="middle"
              fontSize="6"
              fill="rgb(var(--text-muted))"
            >
              {d.value}
            </text>
            <text
              x={x + barW / 2}
              y={height - 6}
              textAnchor="middle"
              fontSize="5.5"
              fill="rgb(var(--text-subtle))"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
