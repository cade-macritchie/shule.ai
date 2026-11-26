// Shule brand pieces (Studio + chapel accent). Tokens live in app/globals.css.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export const BRAND = {
  coral: "#C8402B", deep: "#1B2B5B", violet: "#5B3E8F", butter: "#FFD27A",
  blush: "#FBE3DA", warm: "#FFF8F3", rose: "#E9A08F", ink2: "#44507A",
} as const;

/** Lancet-window mark: four panes under a pointed-round arch (also reads as a document). */
/** The shule mark: a brass school bell, mid-ring, in a deep-blue arch. Drawn in SVG so it stays crisp at any size. */
export function Mark({ size = 40 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={Math.round(size * 0.84)} height={size} viewBox="0 0 40 48" style={{ flex: "none", display: "block" }}>
      <path d="M0 20 A20 20 0 0 1 40 20 V42 A6 6 0 0 1 34 48 H6 A6 6 0 0 1 0 42 Z" fill={BRAND.deep} />
      <g transform="rotate(-16 20 27)">
        <rect x="17.6" y="5.5" width="4.8" height="11" rx="2.4" fill={BRAND.coral} />
        <rect x="15.8" y="15.6" width="8.4" height="3" rx="1.2" fill="#C8922F" />
        <path d="M20 18 C13.6 18 13.2 23.8 12.7 28.4 C12.3 32.4 10.4 34.6 8 36.3 H32 C29.6 34.6 27.7 32.4 27.3 28.4 C26.8 23.8 26.4 18 20 18 Z" fill="#E7B24E" />
        <path d="M16.2 21.5 C15.2 24 15 28 14.6 31" stroke="#FFF1C9" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".75" />
        <rect x="6.6" y="35.2" width="26.8" height="3.4" rx="1.7" fill="#C8922F" />
        <circle cx="22.5" cy="41.2" r="2.6" fill={BRAND.butter} />
      </g>
      <path d="M31.5 10.5 q3 2.2 3.2 5.6 M34.2 7.6 q4.4 3.4 4.4 8.6" stroke={BRAND.butter} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
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
