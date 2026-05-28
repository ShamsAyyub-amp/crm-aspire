// Hand-rolled SVG charts. No deps. Server-rendered.

export function HBar({
  rows,
  unit = "",
  max,
}: {
  rows: { label: string; value: number; sub?: string }[];
  unit?: string;
  max?: number;
}) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const pct = (r.value / m) * 100;
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-28 text-ink-700 truncate">{r.label}</div>
            <div className="flex-1 h-5 bg-ink-100 rounded overflow-hidden relative">
              <div className="h-full bg-brand-500/80" style={{ width: `${pct}%` }} />
            </div>
            <div className="w-24 text-right tabular-nums text-ink-700">
              {Math.round(r.value).toLocaleString()}{unit}
              {r.sub && <span className="text-ink-400 text-xs ml-1">{r.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Funnel({ rows }: { rows: { label: string; count: number; value: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-400">No data.</p>;
  const top = rows[0].count || 1;
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => {
        const pct = (r.count / top) * 100;
        const conversion = i === 0 ? null : Math.round((r.count / (rows[i - 1].count || 1)) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-24 text-xs text-ink-700">{r.label}</div>
            <div className="flex-1 h-7 bg-ink-100 rounded relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500/90 to-brand-400/80 flex items-center px-2 text-[11px] font-medium text-white"
                style={{ width: `${pct}%`, minWidth: pct > 0 ? "32px" : 0 }}
              >
                {r.count}
              </div>
            </div>
            <div className="w-20 text-right tabular-nums text-xs text-ink-500">
              {conversion != null ? `${conversion}% →` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({
  segments,
  total,
  size = 140,
}: {
  segments: { label: string; value: number; color: string }[];
  total?: number;
  size?: number;
}) {
  const sum = total ?? segments.reduce((a, s) => a + s.value, 0);
  if (sum === 0) return <p className="text-sm text-ink-400">No data.</p>;
  const r = size / 2 - 12;
  const C = 2 * Math.PI * r;
  let cursor = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((s, i) => {
          const len = (s.value / sum) * C;
          const offset = cursor;
          cursor += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
            />
          );
        })}
      </svg>
      <ul className="space-y-1.5 text-sm flex-1">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="tabular-nums text-ink-700">{s.value}</span>
            <span className="text-ink-400 text-xs tabular-nums w-10 text-right">{Math.round((s.value / sum) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ForecastCone({
  points,
  height = 140,
}: {
  points: { week: string; commit: number; best: number; pipeline: number }[];
  height?: number;
}) {
  if (points.length === 0) return <p className="text-sm text-ink-400">No data.</p>;
  const W = 600;
  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 24;
  const maxY = Math.max(...points.map((p) => p.pipeline)) || 1;
  const x = (i: number) => padL + ((W - padL - padR) * i) / Math.max(1, points.length - 1);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / maxY);

  const line = (key: "commit" | "best" | "pipeline") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p[key])}`).join(" ");

  // Cone shape between commit (low) and pipeline (high).
  const conePath =
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.pipeline)}`).join(" ") +
    " " +
    points
      .slice()
      .reverse()
      .map((p, i, arr) => `L ${x(points.length - 1 - i)} ${y(p.commit)}`)
      .join(" ") +
    " Z";

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full">
      <path d={conePath} fill="rgba(47,116,255,0.12)" />
      <path d={line("commit")} fill="none" stroke="#1857f0" strokeWidth="2" />
      <path d={line("best")} fill="none" stroke="#2f74ff" strokeDasharray="4 3" strokeWidth="1.5" />
      <path d={line("pipeline")} fill="none" stroke="#8dbcff" strokeWidth="1.5" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.commit)} r="2.5" fill="#1857f0" />
          <text x={x(i)} y={height - 6} className="fill-ink-400" textAnchor="middle" fontSize="10">
            {p.week}
          </text>
        </g>
      ))}
      <g className="fill-ink-400" fontSize="10">
        {[0, 0.5, 1].map((t) => (
          <text key={t} x="2" y={y(maxY * t) + 3}>
            {t === 1 ? compact(maxY) : t === 0.5 ? compact(maxY / 2) : "0"}
          </text>
        ))}
      </g>
    </svg>
  );
}

function compact(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
