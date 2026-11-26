import { test } from "node:test";
import assert from "node:assert/strict";
import { sigmaLevel, pce, quadrant, rankFindings, AuditResult } from "./lss.ts";
import { tagJson } from "./tags.ts";
import { Storyboard } from "./storyboard.ts";
import { readFileSync } from "node:fs";

test("sigma: 3.4 DPMO ≈ 6σ, 66807 DPMO ≈ 3σ", () => {
  assert.equal(sigmaLevel(34, 1e6, 10)!.dpmo, 3);
  assert.ok(Math.abs(sigmaLevel(66807, 1e6, 1)!.sigma - 3) < 0.01);
  assert.ok(Math.abs(sigmaLevel(308538, 1e6, 1)!.sigma - 2) < 0.01);
});

test("pce needs ≥70% stated times", () => {
  const s = (value: "VA" | "NVA", src: "stated" | "unknown") =>
    ({ step: "x", owner: null, system: null, touch_min: 10, wait_min: 30, value, source: src });
  assert.equal(pce([s("VA", "stated"), s("NVA", "unknown"), s("NVA", "unknown")]), null);
  const r = pce([s("VA", "stated"), s("NVA", "stated"), s("NVA", "stated")])!;
  assert.equal(r.lead_min, 120); assert.equal(r.va_min, 10);
});

test("quadrants", () => {
  assert.equal(quadrant(5, 1), "quick win");
  assert.equal(quadrant(4, 5), "major project");
  assert.equal(quadrant(2, 2), "fill-in");
  assert.equal(quadrant(1, 4), "thankless");
});

test("fixture audit parses, ranks, and storyboard validates", () => {
  const raw = readFileSync(new URL("../../../services/worker/tests/fixtures/sample_audit.txt", import.meta.url), "utf8");
  const audit = AuditResult.parse(tagJson(raw, "audit"));
  const ranked = rankFindings(audit.findings);
  assert.equal(ranked[0].rank, 1);
  assert.ok(ranked[0].major);
  const sb = JSON.parse(readFileSync(new URL("../../video/sample-storyboard.json", import.meta.url), "utf8"));
  Storyboard.parse(sb);
});
