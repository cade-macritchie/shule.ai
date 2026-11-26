import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import type { RenderProps, RenderScene } from "@ps/shared/src/storyboard.ts";
import { C, font } from "./theme";
import * as S from "./scenes";

const LABEL: Record<RenderScene["kind"], string> = {
  title: "", current_state: "Current state", waste: "Waste (TIMWOODS)", fishbone: "Root cause analysis",
  metric: "Baseline → target", future_state: "Future state", implementation: "Implementation",
  architecture: "Solution architecture", roadmap: "DMAIC roadmap", control: "Control plan", outro: "Next actions",
  locked: "The full guide",
};

function SceneBody({ s }: { s: RenderScene }) {
  const frames = s.durationInFrames;
  switch (s.kind) {
    case "title": return <S.Title d={s.data} />;
    case "current_state": return <S.Swimlanes d={s.data} mode="current" />;
    case "future_state": return <S.Swimlanes d={s.data} mode="future" />;
    case "waste": return <S.Waste d={s.data} />;
    case "fishbone": return <S.Fishbone d={s.data} />;
    case "metric": return <S.Metric d={s.data} />;
    case "implementation": return <S.Implementation d={s.data} frames={frames} />;
    case "architecture": return <S.Architecture d={s.data} />;
    case "roadmap": return <S.Roadmap d={s.data} />;
    case "control": return <S.Control d={s.data} />;
    case "outro": return <S.Outro d={s.data} />;
    case "locked": return <S.Locked d={s.data} />;
  }
}

/** Captions: split narration into ≤42-char cues spread over the scene by word count. */
function Captions({ text, frames }: { text: string; frames: number }) {
  const f = useCurrentFrame();
  const words = text.split(/\s+/);
  const cues: string[] = [];
  let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > 42) { cues.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) cues.push(cur.trim());
  const per = frames / Math.max(1, cues.length);
  const i = Math.min(cues.length - 1, Math.floor(f / per));
  return (
    <div style={{ position: "absolute", bottom: 54, width: "100%", textAlign: "center" }}>
      <span style={{ background: "rgba(0,0,0,.6)", color: "#fff", fontFamily: font, fontSize: 34, padding: "6px 16px", borderRadius: 8 }}>{cues[i]}</span>
    </div>
  );
}

function Chrome({ s, title, engagement, index, total }: { s: RenderScene; title: string; engagement: string; index: number; total: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = interpolate(f, [0, fps * 0.4, s.durationInFrames - fps * 0.3, s.durationInFrames], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: C.bg, color: C.ink, fontFamily: font, opacity: fade }}>
      {s.kind !== "title" && (
        <div style={{ position: "absolute", top: 44, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 44, fontWeight: 700 }}>{LABEL[s.kind]}</div>
          <div style={{ fontSize: 22, color: C.mute }}>{title} · {engagement}</div>
        </div>
      )}
      <AbsoluteFill style={{ top: s.kind === "title" ? 0 : 130, bottom: 120 }}><SceneBody s={s} /></AbsoluteFill>
      <div style={{ position: "absolute", bottom: 0, left: 0, height: 6, width: `${((index + f / s.durationInFrames) / total) * 100}%`, background: C.accent }} />
    </AbsoluteFill>
  );
}

export const Explainer = (p: RenderProps & { burnCaptions?: boolean }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {p.scenes.map((s, i) => {
        const at = from; from += s.durationInFrames;
        return (
          <Sequence key={i} from={at} durationInFrames={s.durationInFrames}>
            <Chrome s={s} title={p.title} engagement={p.engagement} index={i} total={p.scenes.length} />
            {p.burnCaptions !== false && <Captions text={s.narration} frames={s.durationInFrames} />}
            {s.audio && <Audio src={staticFile(s.audio)} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
