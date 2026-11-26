// Lean Six Sigma model: schemas Claude must return + the numbers we compute ourselves
// (Claude never does arithmetic that reaches the client).
import { z } from "zod";

export const TIMWOODS = [
  "Transport", "Inventory", "Motion", "Waiting",
  "Overproduction", "Over-processing", "Defects", "Skills",
] as const;
export const SIX_M = ["Method", "Machine", "Material", "Man", "Measurement", "Mother Nature"] as const;
export const DMAIC = ["Define", "Measure", "Analyze", "Improve", "Control"] as const;

const Src = z.enum(["stated", "estimated", "unknown"]);
const Score10 = z.number().int().min(1).max(10);
const Score5 = z.number().int().min(1).max(5);

export const Evidence = z.union([
  z.object({ t: z.string().regex(/^\d{1,2}:\d{2}:\d{2}$/), quote: z.string().max(220) }),
  z.object({ page: z.string(), step: z.number().int().nullable().optional() }),
]);

export const ValueStreamStep = z.object({
  step: z.string(),
  owner: z.string().nullable(),
  system: z.string().nullable(),
  touch_min: z.number().nonnegative().nullable(),
  wait_min: z.number().nonnegative().nullable(),
  value: z.enum(["VA", "BVA", "NVA"]),
  source: Src,
  basis: z.string().optional(), // required in spirit when source = estimated
});

export const Finding = z.object({
  title: z.string().max(90),
  summary: z.string(),
  page_path: z.string().nullable(),
  steps: z.array(z.number().int()).default([]),
  waste: z.array(z.enum(TIMWOODS)).min(1),
  value: z.enum(["VA", "BVA", "NVA"]),
  root_causes: z.array(z.object({ m: z.enum(SIX_M), cause: z.string(), root: z.boolean().default(false) })).min(1),
  five_whys: z.array(z.string()).max(5).default([]),
  fmea: z.object({ severity: Score10, occurrence: Score10, detection: Score10 }),
  impact: Score5,
  effort: Score5,
  dmaic: z.object({
    start_phase: z.enum(DMAIC),
    actions: z.record(z.enum(DMAIC), z.string()).default({}),
  }),
  recommendation: z.object({
    future_state: z.string(),
    implementation: z.array(z.object({
      step: z.string(), system: z.string().nullable(), detail: z.string(), owner: z.string().nullable(),
    })).min(1),
    poka_yoke: z.string().nullable().default(null),
  }),
  control_plan: z.array(z.object({
    metric: z.string(), target: z.string(), method: z.string(), owner: z.string().nullable(),
    frequency: z.string(), reaction: z.string(),
  })).default([]),
  evidence: z.array(Evidence).min(1),
  confidence: z.enum(["high", "medium", "low"]),
});

export const AuditResult = z.object({
  summary: z.string(),
  sipoc: z.object({
    suppliers: z.array(z.string()), inputs: z.array(z.string()), process: z.array(z.string()).max(8),
    outputs: z.array(z.string()), customers: z.array(z.string()),
  }),
  value_stream: z.array(ValueStreamStep),
  ctq_tree: z.array(z.object({ need: z.string(), driver: z.string(), ctq: z.string() })).default([]),
  defect_data: z.object({ defects: z.number(), units: z.number(), opportunities: z.number(), source: Src }).nullable().default(null),
  findings: z.array(Finding).max(12),
  questions: z.array(z.object({ importance: z.enum(["high", "medium", "low"]), question: z.string(), why: z.string(), page: z.string().nullable() })).default([]),
  option_analysis: z.array(z.object({
    option: z.string(), cost: z.string(), time: z.string(), risk: z.string(), systems: z.array(z.string()), recommended: z.boolean(),
  })).optional(),
  pilot_plan: z.string().optional(),
});
export type AuditResult = z.infer<typeof AuditResult>;
export type Finding = z.infer<typeof Finding>;

// ---------- computed metrics ----------

export const rpn = (f: Pick<Finding, "fmea">) => f.fmea.severity * f.fmea.occurrence * f.fmea.detection;

export type Quadrant = "quick win" | "major project" | "fill-in" | "thankless";
export function quadrant(impact: number, effort: number): Quadrant {
  const hi = impact >= 3, easy = effort <= 2;
  return hi ? (easy ? "quick win" : "major project") : easy ? "fill-in" : "thankless";
}

export const isMajor = (f: Finding) => rpn(f) >= 200 || (f.impact >= 4 && f.confidence !== "low");

/** Process cycle efficiency; null unless ≥70% of steps have stated times. */
export function pce(vs: z.infer<typeof ValueStreamStep>[]):
  { pce: number; lead_min: number; va_min: number } | null {
  if (!vs.length) return null;
  const stated = vs.filter(s => s.source === "stated" && s.touch_min != null && s.wait_min != null);
  if (stated.length / vs.length < 0.7) return null;
  const known = vs.filter(s => s.touch_min != null && s.wait_min != null);
  const lead = known.reduce((a, s) => a + s.touch_min! + s.wait_min!, 0);
  const va = known.filter(s => s.value === "VA").reduce((a, s) => a + s.touch_min!, 0);
  return lead > 0 ? { pce: va / lead, lead_min: lead, va_min: va } : null;
}

/** Inverse standard normal CDF (Acklam). */
export function normInv(p: number): number {
  if (p <= 0 || p >= 1) throw new RangeError("p must be in (0,1)");
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425, hi = 1 - lo;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  if (p > hi) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/** DPMO and short-term sigma level (with the conventional 1.5σ shift). */
export function sigmaLevel(defects: number, units: number, opportunities: number) {
  if (units <= 0 || opportunities <= 0) return null;
  const dpmo = (defects / (units * opportunities)) * 1e6;
  const y = 1 - dpmo / 1e6;
  const sigma = y >= 1 ? 6 : y <= 0 ? 0 : Math.min(6, normInv(y) + 1.5);
  return { dpmo: Math.round(dpmo), sigma: Math.round(sigma * 100) / 100 };
}

/** Rank findings: major first, then RPN, then impact/effort ratio. */
export function rankFindings<T extends Finding>(fs: T[]): (T & { rpn: number; quadrant: Quadrant; major: boolean; rank: number })[] {
  return fs
    .map(f => ({ ...f, rpn: rpn(f), quadrant: quadrant(f.impact, f.effort), major: isMajor(f) }))
    .sort((x, y) => Number(y.major) - Number(x.major) || y.rpn - x.rpn || y.impact / y.effort - x.impact / x.effort)
    .map((f, i) => ({ ...f, rank: i + 1 }));
}
