// Shule brand pieces (Studio + chapel accent). Tokens live in app/globals.css.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const BRAND = {
  coral: "#C8402B", deep: "#1B2B5B", violet: "#5B3E8F", butter: "#FFD27A",
  blush: "#FBE3DA", warm: "#FFF8F3", rose: "#E9A08F", ink2: "#44507A",
} as const;

/** Lancet-window mark: four panes under a pointed-round arch (also reads as a document). */
export function Mark({ size = 40 }: { size?: number }) {
  const w = Math.round(size * 0.78), r = w / 2, pad = Math.max(3, Math.round(size / 11)), g = Math.max(2, Math.round(size / 20));
  const pane = (bg: string, radius = "0") => <div style={{ background: bg, borderRadius: radius }} />;
  return (
    <div aria-hidden="true" style={{
      width: w, height: size, borderRadius: `${r}px ${r}px ${size / 7}px ${size / 7}px`, background: BRAND.deep,
      padding: pad, boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr 1fr", gap: g, flex: "none",
    }}>
      {pane(BRAND.coral, `${r}px 0 0 0`)}{pane(BRAND.butter, `0 ${r}px 0 0`)}
      {pane(BRAND.violet)}{pane(BRAND.blush)}
      {pane(BRAND.butter)}{pane(BRAND.coral)}
    </div>
  );
}

export function Logo({ size = 34, light = false }: { size?: number; light?: boolean }) {
  return (
    <Link href="/" prefetch={false} style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3, textDecoration: "none", color: light ? BRAND.warm : BRAND.deep }}>
      <Mark size={size * 1.25} />
      <span style={{ fontSize: size * 0.85, fontWeight: 800, letterSpacing: "-0.04em" }}>shule</span>
    </Link>
  );
}

/** Serif italic accent: one phrase per headline, never more. */
export const Accent = ({ children, color }: { children: ReactNode; color?: string }) => (
  <span className="accent" style={color ? { color } : undefined}>{children}</span>
);

// Stained-glass band: a few large panes with diagonal, jagged cuts and heavy lead lines.
const PANES: [string, string][] = [
  [BRAND.coral, "0,0 200,0 330,120 0,120"],
  [BRAND.butter, "200,0 470,0 443,40 281,75"],
  [BRAND.violet, "281,75 443,40 390,120 330,120"],
  [BRAND.blush, "470,0 700,0 820,120 390,120"],
  [BRAND.coral, "700,0 980,0 923,85 745,45"],
  [BRAND.butter, "745,45 923,85 900,120 820,120"],
  [BRAND.violet, "980,0 1130,0 1240,120 900,120"],
  [BRAND.rose, "1130,0 1296,0 1296,120 1240,120"],
];
const FACETS = ["40,30 150,95", "560,20 610,90", "1020,25 1090,100", "330,10 400,22"];

export function StainedGlass({ height = 120, crop, style }: { height?: number; crop?: number; style?: CSSProperties }) {
  return (
    <svg viewBox={`0 0 ${crop ?? 1296} 120`} preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ display: "block", width: "100%", height, ...style }}>
      {PANES.map(([fill, pts], i) => <polygon key={i} points={pts} fill={fill} />)}
      {FACETS.map((pts, i) => <polyline key={i} points={pts} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" />)}
      {PANES.map(([, pts], i) => <polygon key={i} points={pts} fill="none" stroke={BRAND.deep} strokeWidth={7} strokeLinejoin="round" />)}
      <rect x={0} y={0} width={1296} height={120} fill="none" stroke={BRAND.deep} strokeWidth={10} />
    </svg>
  );
}

export const VERSE = { text: "Let all things be done decently and in order.", ref: "1 Cor. 14:40" };
