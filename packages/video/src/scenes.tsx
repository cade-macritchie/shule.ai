import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@ps/shared/src/storyboard.ts";
import { C, valueColor } from "./theme";

type D<K extends Scene["kind"]> = Extract<Scene, { kind: K }>["data"];

const useIn = (delaySec: number) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  return spring({ frame: f - delaySec * fps, fps, config: { damping: 18, mass: 0.7 } });
};
const Appear = ({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const t = useIn(delay);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 24}px)`, ...style }}>{children}</div>;
};
const Chip = ({ children, color = C.accent }: { children: React.ReactNode; color?: string }) => (
  <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 999, background: color + "33", color, fontSize: 24, fontWeight: 600, marginRight: 10 }}>{children}</span>
);
const Pad = ({ children }: { children: React.ReactNode }) => <AbsoluteFill style={{ padding: "20px 80px" }}>{children}</AbsoluteFill>;

export function Title({ d }: { d: D<"title"> }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: 120 }}>
      <Appear delay={0.2}><div style={{ fontSize: 30, color: C.cyan, letterSpacing: 4, textTransform: "uppercase" }}>Improvement guide</div></Appear>
      <Appear delay={0.5}><div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 16, maxWidth: 1500 }}>{d.title}</div></Appear>
      <Appear delay={0.9}><div style={{ fontSize: 40, color: C.mute, marginTop: 24 }}>{d.subtitle}</div></Appear>
      {d.stat && <Appear delay={1.4}><div style={{ marginTop: 48, fontSize: 48, color: C.amber, fontWeight: 700 }}>{d.stat}</div></Appear>}
    </AbsoluteFill>
  );
}

export function Swimlanes({ d, mode }: { d: D<"current_state">; mode: "current" | "future" }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const pulse = 0.55 + 0.45 * Math.sin(f / 6);
  let k = 0;
  return (
    <Pad>
      {d.lanes.map((lane, li) => (
        <div key={li} style={{ display: "flex", alignItems: "center", borderBottom: `2px dashed ${C.line}`, padding: "18px 0", minHeight: 150 }}>
          <div style={{ width: 260, fontSize: 28, fontWeight: 700, color: C.mute }}>{lane.owner}</div>
          <div style={{ display: "flex", gap: 22, alignItems: "center", flex: 1 }}>
            {lane.steps.map(s => {
              const delay = 0.3 + 0.35 * k++;
              const removed = mode === "future" && s.removed;
              const gone = removed ? interpolate(f, [(delay + 1.2) * fps, (delay + 2) * fps], [1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
              const nva = mode === "current" && s.value === "NVA";
              return (
                <Appear key={s.id} delay={delay}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: gone }}>
                    <div style={{
                      position: "relative", padding: "18px 22px", borderRadius: 14, background: C.panel, fontSize: 26, maxWidth: 300,
                      border: `3px solid ${valueColor(s.value)}`, boxShadow: nva ? `0 0 ${30 * pulse}px ${C.red}` : "none",
                      textDecoration: removed ? "line-through" : "none",
                    }}>
                      {s.label}
                      {s.value && <div style={{ fontSize: 18, color: valueColor(s.value), marginTop: 6 }}>{s.value}</div>}
                      {mode === "future" && s.automated && <div style={{ position: "absolute", top: -18, right: -14, background: C.amber, color: "#000", borderRadius: 999, padding: "2px 12px", fontSize: 20, fontWeight: 700 }}>⚡ automated</div>}
                    </div>
                    {s.wait_label && <div style={{ fontSize: 20, color: mode === "current" ? C.red : C.green, minWidth: 120, textAlign: "center" }}>⏳ {s.wait_label}<div style={{ height: 3, background: "currentColor", marginTop: 4 }} /></div>}
                  </div>
                </Appear>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 24, display: "flex", gap: 24, fontSize: 22, color: C.mute }}>
        <span><b style={{ color: C.green }}>■</b> value-adding</span><span><b style={{ color: C.amber }}>■</b> business-required</span><span><b style={{ color: C.red }}>■</b> waste</span>
      </div>
    </Pad>
  );
}

const TIMWOODS = ["Transport", "Inventory", "Motion", "Waiting", "Overproduction", "Over-processing", "Defects", "Skills"] as const;
export function Waste({ d }: { d: D<"waste"> }) {
  return (
    <Pad>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 26 }}>
        {TIMWOODS.map((w, i) => {
          const on = d.present.includes(w);
          return (
            <Appear key={w} delay={0.2 + i * 0.15}>
              <div style={{ height: 200, borderRadius: 18, background: on ? C.red : C.panel, opacity: on ? 1 : 0.4, padding: 24, border: `2px solid ${on ? C.red : C.line}` }}>
                <div style={{ fontSize: 72, fontWeight: 800 }}>{w[0]}</div>
                <div style={{ fontSize: 30 }}>{w}</div>
              </div>
            </Appear>
          );
        })}
      </div>
      {d.quote && <Appear delay={2}><div style={{ marginTop: 44, fontSize: 36, fontStyle: "italic", color: C.ink, borderLeft: `6px solid ${C.cyan}`, paddingLeft: 24 }}>“{d.quote}”</div></Appear>}
    </Pad>
  );
}

export function Fishbone({ d }: { d: D<"fishbone"> }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const W = 1760, H = 760, midY = H / 2, headX = W - 330;
  const ms = ["Method", "Machine", "Material", "Man", "Measurement", "Mother Nature"] as const;
  const spine = interpolate(f, [0, fps], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "0 80px" }}>
      <svg width={W} height={H}>
        <line x1={40} y1={midY} x2={40 + (headX - 40) * spine} y2={midY} stroke={C.ink} strokeWidth={6} />
        <foreignObject x={headX + 10} y={midY - 90} width={310} height={180}>
          <div style={{ background: C.red, borderRadius: 14, padding: 18, fontSize: 28, fontWeight: 700, color: "#fff", height: "100%", display: "flex", alignItems: "center" }}>{d.effect}</div>
        </foreignObject>
        {ms.map((m, i) => {
          const top = i % 2 === 0, col = Math.floor(i / 2);
          const x = 220 + col * 470, y2 = top ? 70 : H - 70;
          const t = interpolate(f, [(1 + i * 0.4) * fps, (1.6 + i * 0.4) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const causes = d.causes.filter(c => c.m === m);
          return (
            <g key={m} opacity={t}>
              <line x1={x + 150} y1={midY} x2={x + 150 - 140 * t} y2={midY + (y2 - midY) * t} stroke={C.mute} strokeWidth={4} />
              <text x={x - 10} y={top ? y2 - 14 : y2 + 40} fill={C.cyan} fontSize={30} fontWeight={700}>{m}</text>
              {causes.map((c, j) => {
                const ct = interpolate(f, [(2.5 + i * 0.4 + j * 0.5) * fps, (3 + i * 0.4 + j * 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const cy = top ? y2 + 50 + j * 64 : y2 - 50 - j * 64;
                return (
                  <foreignObject key={j} x={x - 60 + (top ? j * 20 : j * 20)} y={cy - 26} width={400} height={60} opacity={ct}>
                    <div style={{ fontSize: 22, color: c.root ? "#fff" : C.ink, background: c.root ? C.red : "transparent", borderRadius: 8, padding: "4px 10px", fontWeight: c.root ? 700 : 400 }}>
                      {c.root ? "◎ " : "• "}{c.cause}
                    </div>
                  </foreignObject>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export function Metric({ d }: { d: D<"metric"> }) {
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Appear delay={0.2}><div style={{ fontSize: 40, color: C.mute, textAlign: "center" }}>{d.label}</div></Appear>
      <div style={{ display: "flex", gap: 120, alignItems: "center", marginTop: 40 }}>
        <Appear delay={0.6}><div style={{ textAlign: "center" }}><div style={{ fontSize: 30, color: C.mute }}>Today</div><div style={{ fontSize: 140, fontWeight: 800, color: C.red }}>{d.baseline}</div></div></Appear>
        <Appear delay={1.2}><div style={{ fontSize: 100, color: C.mute }}>→</div></Appear>
        <Appear delay={1.6}><div style={{ textAlign: "center" }}><div style={{ fontSize: 30, color: C.mute }}>Target</div><div style={{ fontSize: 140, fontWeight: 800, color: C.green }}>{d.target}</div></div></Appear>
      </div>
      <Appear delay={2.2}><Chip color={d.source === "stated" ? C.green : C.amber}>{d.source === "stated" ? "as reported in the interview" : "estimate"}</Chip></Appear>
    </AbsoluteFill>
  );
}

export function Implementation({ d, frames }: { d: D<"implementation">; frames: number }) {
  const { fps } = useVideoConfig(); // NB: durationInFrames here would be the whole video, not the scene
  const span = frames / fps - 2;
  const step = Math.max(0.6, span / d.steps.length);
  return (
    <Pad>
      {d.steps.map((s, i) => (
        <Appear key={i} delay={0.3 + i * step} style={{ display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 26 }}>
          <div style={{ minWidth: 70, height: 70, borderRadius: 35, background: C.accent, fontSize: 36, fontWeight: 800, display: "grid", placeItems: "center" }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{s.title} {s.system && <Chip color={C.cyan}>{s.system}</Chip>}{s.owner && <Chip color={C.mute}>{s.owner}</Chip>}</div>
            <div style={{ fontSize: 27, color: C.mute, marginTop: 6, maxWidth: 1600, fontFamily: "ui-monospace, Consolas, monospace" }}>{s.detail}</div>
          </div>
        </Appear>
      ))}
    </Pad>
  );
}

/** Layered left→right layout from edges (sources in column 0). */
function layout(nodes: D<"architecture">["nodes"], edges: D<"architecture">["edges"]) {
  const col = new Map<string, number>(nodes.map(n => [n.id, 0]));
  for (let pass = 0; pass < nodes.length; pass++)
    for (const e of edges) col.set(e.to, Math.max(col.get(e.to) ?? 0, (col.get(e.from) ?? 0) + 1));
  const cols = Math.max(...col.values()) + 1;
  const rows = new Map<number, string[]>();
  nodes.forEach(n => rows.set(col.get(n.id)!, [...(rows.get(col.get(n.id)!) ?? []), n.id]));
  const pos = new Map<string, { x: number; y: number }>();
  const usable = 1840 - 80 - 220; // svg width - margins - box width
  rows.forEach((ids, c) => ids.forEach((id, r) => pos.set(id, {
    x: cols === 1 ? 790 : 40 + c * (usable / (cols - 1)),
    y: 120 + (r + 0.5) * (620 / ids.length),
  })));
  return pos;
}
export function Architecture({ d }: { d: D<"architecture"> }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const pos = layout(d.nodes, d.edges);
  const kindColor = { system: C.cyan, automation: C.amber, person: C.green, data: C.accent } as const;
  const BW = 220, BH = 96;
  return (
    <AbsoluteFill style={{ padding: "0 40px" }}>
      <svg width={1840} height={820}>
        <defs><marker id="ah" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill={C.mute} /></marker></defs>
        {d.edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to); if (!a || !b) return null;
          const t = interpolate(f, [(1 + i * 0.5) * fps, (1.6 + i * 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const x1 = a.x + BW, y1 = a.y, x2 = b.x, y2 = b.y;
          return (
            <g key={i} opacity={t}>
              <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * t} y2={y1 + (y2 - y1) * t} stroke={C.mute} strokeWidth={3} markerEnd={t > 0.95 ? "url(#ah)" : undefined} />
              {e.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 14} fill={C.cyan} fontSize={18} textAnchor="middle">{e.label}</text>}
            </g>
          );
        })}
        {d.nodes.map((n, i) => {
          const p = pos.get(n.id)!;
          const t = interpolate(f, [i * 0.2 * fps, (i * 0.2 + 0.5) * fps], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <g key={n.id} opacity={t}>
              <rect x={p.x} y={p.y - BH / 2} width={BW} height={BH} rx={16} fill={C.panel} stroke={kindColor[n.kind]} strokeWidth={3} />
              <text x={p.x + BW / 2} y={p.y - 4} fill={C.ink} fontSize={22} fontWeight={700} textAnchor="middle">{n.label}</text>
              <text x={p.x + BW / 2} y={p.y + 28} fill={kindColor[n.kind]} fontSize={18} textAnchor="middle">{n.kind}</text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}

export function Roadmap({ d }: { d: D<"roadmap"> }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const line = interpolate(f, [0, 1.2 * fps], [0, 100], { extrapolateRight: "clamp" });
  return (
    <Pad>
      <div style={{ position: "relative", marginTop: 220 }}>
        <div style={{ height: 8, background: C.accent, width: `${line}%`, borderRadius: 4 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: -30 }}>
          {d.phases.map((p, i) => (
            <Appear key={i} delay={0.6 + i * 0.5} style={{ width: `${100 / d.phases.length - 2}%` }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: C.cyan, color: "#000", fontWeight: 800, fontSize: 28, display: "grid", placeItems: "center" }}>{p.phase[0]}</div>
              <div style={{ fontSize: 34, fontWeight: 700, marginTop: 16 }}>{p.phase}</div>
              <div style={{ fontSize: 24, color: C.cyan }}>{p.weeks}</div>
              <div style={{ fontSize: 26, color: C.mute, marginTop: 8 }}>{p.milestone}</div>
            </Appear>
          ))}
        </div>
      </div>
    </Pad>
  );
}

export function Control({ d }: { d: D<"control"> }) {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  // Illustrative SPC chart: deterministic points within limits, revealed over time.
  const pts = Array.from({ length: 24 }, (_, i) => 50 + 18 * Math.sin(i * 1.7) * Math.cos(i * 0.6));
  const shown = Math.floor(interpolate(f, [fps, 4 * fps], [0, pts.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const W = 760, H = 380, y = (v: number) => H - (v / 100) * H;
  return (
    <Pad>
      <div style={{ display: "flex", gap: 60 }}>
        <div style={{ flex: 1 }}>
          {d.rows.map((r, i) => (
            <Appear key={i} delay={0.3 + i * 0.4} style={{ background: C.panel, borderRadius: 14, padding: "16px 22px", marginBottom: 16, borderLeft: `6px solid ${C.green}` }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{r.metric}</div>
              <div style={{ fontSize: 24, color: C.mute }}>Target <b style={{ color: C.green }}>{r.target}</b> · {r.owner} · {r.frequency}</div>
            </Appear>
          ))}
        </div>
        <div>
          <svg width={W} height={H + 40}>
            {[["UCL", 85, C.red], ["CL", 50, C.mute], ["LCL", 15, C.red]].map(([l, v, c]) => (
              <g key={l as string}><line x1={0} x2={W - 60} y1={y(v as number)} y2={y(v as number)} stroke={c as string} strokeDasharray="10 8" strokeWidth={2} />
                <text x={W - 50} y={y(v as number) + 7} fill={c as string} fontSize={20}>{l}</text></g>
            ))}
            <polyline fill="none" stroke={C.cyan} strokeWidth={4} points={pts.slice(0, shown).map((v, i) => `${i * ((W - 80) / 23)},${y(v)}`).join(" ")} />
            {pts.slice(0, shown).map((v, i) => <circle key={i} cx={i * ((W - 80) / 23)} cy={y(v)} r={6} fill={C.cyan} />)}
            <text x={0} y={H + 34} fill={C.mute} fontSize={20}>{d.chart_label} (illustrative)</text>
          </svg>
        </div>
      </div>
    </Pad>
  );
}

export function Outro({ d }: { d: D<"outro"> }) {
  return (
    <Pad>
      {d.actions.map((a, i) => (
        <Appear key={i} delay={0.3 + i * 0.6} style={{ display: "flex", alignItems: "center", gap: 30, marginTop: i ? 30 : 80 }}>
          <div style={{ fontSize: 64, fontWeight: 800, color: C.accent }}>{i + 1}</div>
          <div><div style={{ fontSize: 44, fontWeight: 700 }}>{a.action}</div><div style={{ fontSize: 28, color: C.mute }}>Owner: {a.owner}</div></div>
        </Appear>
      ))}
    </Pad>
  );
}
