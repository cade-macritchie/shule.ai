// Storyboard: what Claude returns for an explainer video; rendered by packages/video.
import { z } from "zod";
import { TIMWOODS, SIX_M, DMAIC } from "./lss.ts";

const Lane = z.object({
  owner: z.string(),
  steps: z.array(z.object({
    id: z.string(), label: z.string(), value: z.enum(["VA", "BVA", "NVA"]).optional(),
    wait_label: z.string().optional(), // e.g. "~2 days (stated)"
    automated: z.boolean().optional(), removed: z.boolean().optional(),
  })),
});

const base = { narration: z.string().min(1).max(900) };

export const Scene = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("title"), ...base, data: z.object({ title: z.string(), subtitle: z.string(), stat: z.string().optional() }) }),
  z.object({ kind: z.literal("current_state"), ...base, data: z.object({ lanes: z.array(Lane).min(1).max(5) }) }),
  z.object({ kind: z.literal("waste"), ...base, data: z.object({ present: z.array(z.enum(TIMWOODS)).min(1), quote: z.string().max(200).optional() }) }),
  z.object({ kind: z.literal("fishbone"), ...base, data: z.object({
    effect: z.string(),
    causes: z.array(z.object({ m: z.enum(SIX_M), cause: z.string(), root: z.boolean().optional() })).min(1).max(12),
  }) }),
  z.object({ kind: z.literal("metric"), ...base, data: z.object({
    label: z.string(), baseline: z.string(), target: z.string(), source: z.enum(["stated", "estimated"]),
  }) }),
  z.object({ kind: z.literal("future_state"), ...base, data: z.object({ lanes: z.array(Lane).min(1).max(5) }) }),
  z.object({ kind: z.literal("implementation"), ...base, data: z.object({
    steps: z.array(z.object({ title: z.string(), system: z.string().nullable(), detail: z.string().max(220), owner: z.string().nullable() })).min(1).max(7),
  }) }),
  z.object({ kind: z.literal("architecture"), ...base, data: z.object({
    nodes: z.array(z.object({ id: z.string(), label: z.string(), kind: z.enum(["system", "automation", "person", "data"]) })).min(2).max(9),
    edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional() })),
  }) }),
  z.object({ kind: z.literal("roadmap"), ...base, data: z.object({
    phases: z.array(z.object({ phase: z.enum(DMAIC), weeks: z.string(), milestone: z.string() })).min(2).max(5),
  }) }),
  z.object({ kind: z.literal("control"), ...base, data: z.object({
    rows: z.array(z.object({ metric: z.string(), target: z.string(), owner: z.string(), frequency: z.string() })).min(1).max(5),
    chart_label: z.string(),
  }) }),
  z.object({ kind: z.literal("outro"), ...base, data: z.object({ actions: z.array(z.object({ action: z.string(), owner: z.string() })).min(1).max(3) }) }),
]);

export const Storyboard = z.object({
  title: z.string(),
  engagement: z.string(),
  scenes: z.array(Scene).min(4).max(14),
});
export type Storyboard = z.infer<typeof Storyboard>;
export type Scene = z.infer<typeof Scene>;

/** Render-only scene (never from Claude): ends a free preview and lists what the full guide covers. */
export type LockedScene = {
  kind: "locked"; narration: string;
  data: { headline: string; items: { label: string; detail?: string }[]; cta: string; price?: string };
};

/** Props passed to Remotion after TTS: each scene gets its audio and length. */
export type RenderScene = (Scene | LockedScene) & { audio?: string; durationInFrames: number };

/** Scenes a free preview shows: the problem, up to and including the root cause (and a real metric if present). */
export const PREVIEW_KINDS = ["title", "current_state", "waste", "fishbone", "metric"] as const;
export type RenderProps = { title: string; engagement: string; fps: number; scenes: RenderScene[] };

export const WPM = 140;
export const estimateSeconds = (text: string) => Math.max(3, (text.trim().split(/\s+/).length / WPM) * 60);
