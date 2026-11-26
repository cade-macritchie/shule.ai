import type { CSSProperties } from "react";

/**
 * Small looping illustrations for the four deliverables. Pure SVG + CSS keyframes (see `.da-*` in globals.css),
 * so they work in the static export and stop moving for people who prefer reduced motion.
 */
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;
const INK = "#1B2B5B", CORAL = "#C8402B", VIOLET = "#5B3E8F", BUTTER = "#FFD27A", GOLD = "#E7B24E", LINE = "#D9CFC6";

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg className="da" viewBox="0 0 220 130" role="img" aria-label={label} style={{ width: "100%", height: "auto", display: "block" }}>
      <rect x="0" y="0" width="220" height="130" rx="14" fill="#FFFDFB" />
      {children}
    </svg>
  );
}

/** Docs: a page writes itself while the process map beside it draws node by node. */
export function DocsArt() {
  return (
    <Frame label="A process document writing itself next to a process map that draws step by step">
      <rect x="14" y="14" width="78" height="102" rx="8" fill="#fff" stroke={LINE} />
      <rect className="da-write" style={d(0)} x="24" y="26" width="44" height="6" rx="3" fill={INK} />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <rect key={i} className="da-write" style={d(0.3 + i * 0.25)} x="24" y={42 + i * 11} width={i % 3 === 2 ? 36 : 58} height="4" rx="2" fill={i === 3 ? CORAL : "#B9B2C9"} />
      ))}
      <path className="da-draw" style={d(0.6)} d="M128 32 V52 M128 70 V80 Q128 86 134 86 H166 M128 70 Q128 64 140 64 H166" stroke={VIOLET} strokeWidth="2" fill="none" pathLength={1} />
      {[[112, 18, INK, 0.4], [112, 52, VIOLET, 1.1], [166, 54, CORAL, 1.7], [166, 76, GOLD, 2.1]].map(([x, y, c, t], i) => (
        <rect key={i} className="da-pop" style={d(t as number)} x={x as number} y={y as number} width={i < 2 ? 32 : 40} height="18" rx={i === 1 ? 9 : 5} fill={c as string} />
      ))}
      <circle className="da-pop" style={d(2.6)} cx="200" cy="56" r="6" fill={BUTTER} />
      <text className="da-pop" style={d(2.6)} x="200" y="59" textAnchor="middle" fontSize="8" fontWeight="800" fill={INK}>?</text>
    </Frame>
  );
}

/** Diagnosis: a Pareto chart grows, a lens sweeps across, and the root cause gets flagged. */
export function DiagnosisArt() {
  const bars = [62, 44, 30, 20, 13, 8];
  return (
    <Frame label="A Pareto chart grows and a magnifying glass finds the root cause">
      <line x1="18" y1="108" x2="150" y2="108" stroke={LINE} strokeWidth="2" />
      {bars.map((h, i) => (
        <rect key={i} className="da-grow" style={d(0.2 + i * 0.18)} x={22 + i * 21} y={108 - h} width="15" height={h} rx="3" fill={i === 0 ? CORAL : i < 2 ? GOLD : "#C9BFD9"} />
      ))}
      <path className="da-draw" style={d(1.4)} d="M29 58 L50 46 L71 40 L92 36 L113 34 L134 33" stroke={INK} strokeWidth="2" fill="none" pathLength={1} strokeDasharray="1" />
      <g className="da-lens">
        <circle cx="0" cy="0" r="13" fill="rgba(255,210,122,.18)" stroke={INK} strokeWidth="3" />
        <line x1="9" y1="9" x2="19" y2="19" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="da-pop" style={d(3)}>
        <rect x="146" y="30" width="64" height="34" rx="8" fill={INK} />
        <text x="178" y="44" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={BUTTER}>ROOT CAUSE</text>
        <text x="178" y="56" textAnchor="middle" fontSize="7" fill="#fff">+ what's missing</text>
      </g>
    </Frame>
  );
}

/** Remedy video: a tangled "before" flow cross-fades to a clean "after" while the player's progress bar fills. */
export function RemedyArt() {
  return (
    <Frame label="A video player showing a tangled process becoming a straight, simple one">
      <rect x="14" y="12" width="192" height="94" rx="10" fill={INK} />
      <g className="da-before">
        <text x="26" y="28" fontSize="8" fontWeight="800" fill={BUTTER}>NOW</text>
        <path d="M30 70 C50 30 70 100 92 60 S120 30 132 76 S170 40 190 66" stroke="#F4A79A" strokeWidth="3" fill="none" strokeDasharray="5 4" />
        {[30, 92, 132, 190].map((x, i) => <circle key={i} cx={x} cy={[70, 60, 76, 66][i]} r="6" fill={CORAL} />)}
      </g>
      <g className="da-after">
        <text x="26" y="28" fontSize="8" fontWeight="800" fill={BUTTER}>AFTER THE FIX</text>
        <path d="M30 64 H190" stroke="#A9E2C1" strokeWidth="3" />
        {[30, 110, 190].map(x => <circle key={x} cx={x} cy="64" r="7" fill="#3E9E6B" />)}
        <path d="M184 64 l4 4 l7 -8" stroke="#fff" strokeWidth="2" fill="none" transform="translate(-4 0)" />
      </g>
      <rect x="14" y="112" width="192" height="6" rx="3" fill="#EDE6F6" />
      <rect className="da-progress" x="14" y="112" width="192" height="6" rx="3" fill={VIOLET} />
    </Frame>
  );
}

/** Build it: steps tick off one by one, then the AI prompt types itself out with a copy button. */
export function BuildArt() {
  return (
    <Frame label="A checklist ticks off build steps, then an AI prompt types itself out">
      {[0, 1, 2].map(i => (
        <g key={i}>
          <rect x="16" y={14 + i * 18} width="12" height="12" rx="3" fill="#fff" stroke={INK} strokeWidth="1.5" />
          <path className="da-draw" style={d(0.4 + i * 0.6)} d={`M19 ${20 + i * 18} l3 3 l5 -6`} stroke="#3E9E6B" strokeWidth="2.2" fill="none" pathLength={1} />
          <rect x="34" y={17 + i * 18} width={[70, 58, 80][i]} height="5" rx="2.5" fill="#B9B2C9" />
          <text x="120" y={23 + i * 18} fontSize="7" fontWeight="700" fill={VIOLET}>{["Step 1", "Step 2", "Step 3"][i]}</text>
        </g>
      ))}
      <rect x="14" y="70" width="192" height="48" rx="9" fill={INK} />
      <text x="24" y="83" fontSize="7" fontWeight="800" fill={BUTTER}>PROMPT</text>
      <clipPath id="da-type"><rect className="da-type" x="24" y="86" width="150" height="26" /></clipPath>
      <g clipPath="url(#da-type)">
        <text x="24" y="95" fontSize="7.5" fill="#fff" fontFamily="ui-monospace, monospace">Build a referral program in our</text>
        <text x="24" y="106" fontSize="7.5" fill="#fff" fontFamily="ui-monospace, monospace">ATS: fields, emails, owner…</text>
      </g>
      <rect className="da-pop" style={d(3.6)} x="168" y="76" width="30" height="14" rx="7" fill={CORAL} />
      <text className="da-pop" style={d(3.6)} x="183" y="86" textAnchor="middle" fontSize="7" fontWeight="800" fill="#fff">Copy</text>
    </Frame>
  );
}

export const DELIVERABLE_ART = [DocsArt, DiagnosisArt, RemedyArt, BuildArt];
