"use client";
// Impact/effort matrix: x = effort (1–5, left = easy), y = impact; bubble size = RPN; red = major.
export type FindingRow = {
  id: string; rank: number; title: string; impact: number; effort: number; rpn: number; major: boolean;
  quadrant: string; waste: string[]; confidence: string;
};

export function FindingsMatrix({ rows, onPick }: { rows: FindingRow[]; onPick: (id: string) => void }) {
  const W = 520, H = 380, P = 44;
  const x = (e: number) => P + ((e - 0.5) / 5) * (W - 2 * P);
  const y = (i: number) => H - P - ((i - 0.5) / 5) * (H - 2 * P);
  // spread overlapping dots
  const seen = new Map<string, number>();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W }} role="img" aria-label="Impact versus effort matrix">
      <rect x={P} y={P} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2} fill="#dcfce7" opacity=".5" />
      <rect x={W / 2} y={P} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2} fill="#e0e7ff" opacity=".5" />
      <text x={P + 8} y={P + 18} fontSize="12" fill="#166534">Quick wins</text>
      <text x={W - P - 8} y={P + 18} fontSize="12" fill="#3730a3" textAnchor="end">Major projects</text>
      <text x={P + 8} y={H - P - 8} fontSize="12" fill="#64748b">Fill-ins</text>
      <text x={W - P - 8} y={H - P - 8} fontSize="12" fill="#64748b" textAnchor="end">Thankless</text>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#94a3b8" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#94a3b8" />
      <text x={W / 2} y={H - 12} fontSize="12" textAnchor="middle" fill="#475569">Effort →</text>
      <text x={14} y={H / 2} fontSize="12" textAnchor="middle" fill="#475569" transform={`rotate(-90 14 ${H / 2})`}>Impact →</text>
      {rows.map(r => {
        const k = `${r.effort}-${r.impact}`; const n = seen.get(k) ?? 0; seen.set(k, n + 1);
        const cx = x(r.effort) + (n % 3) * 14 - 14 * (n > 0 ? 1 : 0), cy = y(r.impact) - Math.floor(n / 3) * 14;
        const rad = 8 + Math.min(16, r.rpn / 40);
        return (
          <g key={r.id} style={{ cursor: "pointer" }} onClick={() => onPick(r.id)}>
            <title>{`#${r.rank} ${r.title} · RPN ${r.rpn}`}</title>
            <circle cx={cx} cy={cy} r={rad} fill={r.major ? "#dc2626" : "#4f46e5"} opacity=".8" />
            <text x={cx} y={cy + 4} fontSize="11" fill="#fff" textAnchor="middle" fontWeight="700">{r.rank}</text>
          </g>
        );
      })}
    </svg>
  );
}

const WASTES = ["Transport", "Inventory", "Motion", "Waiting", "Overproduction", "Over-processing", "Defects", "Skills"];
export function WasteHeat({ rows }: { rows: FindingRow[] }) {
  const counts = WASTES.map(w => rows.filter(r => r.waste.includes(w)).length);
  const max = Math.max(1, ...counts);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
      {WASTES.map((w, i) => (
        <div key={w} style={{ padding: "10px 8px", borderRadius: 8, textAlign: "center", fontSize: 13,
          background: `rgba(220,38,38,${0.08 + 0.75 * (counts[i] / max)})`, color: counts[i] / max > 0.5 ? "#fff" : "#0f172a" }}>
          <b>{w[0]}</b> {w}<br /><span style={{ fontSize: 18, fontWeight: 700 }}>{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
