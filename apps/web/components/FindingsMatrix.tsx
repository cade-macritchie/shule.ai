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
      <rect x={P} y={P} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2} fill="#FFF0CC" opacity=".8" />
      <rect x={W / 2} y={P} width={(W - 2 * P) / 2} height={(H - 2 * P) / 2} fill="#EDE6F6" opacity=".8" />
      <text x={P + 8} y={P + 18} fontSize="12" fill="#7A5200">Quick wins</text>
      <text x={W - P - 8} y={P + 18} fontSize="12" fill="#4A2F7A" textAnchor="end">Major projects</text>
      <text x={P + 8} y={H - P - 8} fontSize="12" fill="#44507A">Fill-ins</text>
      <text x={W - P - 8} y={H - P - 8} fontSize="12" fill="#44507A" textAnchor="end">Thankless</text>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#C9B8AA" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="#C9B8AA" />
      <text x={W / 2} y={H - 12} fontSize="12" textAnchor="middle" fill="#44507A">Effort →</text>
      <text x={14} y={H / 2} fontSize="12" textAnchor="middle" fill="#44507A" transform={`rotate(-90 14 ${H / 2})`}>Impact →</text>
      {rows.map(r => {
        const k = `${r.effort}-${r.impact}`; const n = seen.get(k) ?? 0; seen.set(k, n + 1);
        const cx = x(r.effort) + (n % 3) * 14 - 14 * (n > 0 ? 1 : 0), cy = y(r.impact) - Math.floor(n / 3) * 14;
        const rad = 8 + Math.min(16, r.rpn / 40);
        return (
          <g key={r.id} style={{ cursor: "pointer" }} onClick={() => onPick(r.id)}>
            <title>{`#${r.rank} ${r.title} · RPN ${r.rpn}`}</title>
            <circle cx={cx} cy={cy} r={rad} fill={r.major ? "#C8402B" : "#1B2B5B"} opacity=".9" />
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
        <div key={w} style={{ padding: "10px 8px", borderRadius: "22px 22px 8px 8px", textAlign: "center", fontSize: 13,
          background: `rgba(200,64,43,${0.08 + 0.82 * (counts[i] / max)})`, color: counts[i] / max > 0.5 ? "#fff" : "#1B2B5B" }}>
          <b>{w[0]}</b> {w}<br /><span style={{ fontSize: 18, fontWeight: 700 }}>{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
