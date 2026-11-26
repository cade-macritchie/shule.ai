import { test } from "node:test";
import assert from "node:assert/strict";
import { Vad, resample, wav } from "./vad.ts";

const SR = 16000, BLOCK = 512; // 32 ms blocks
const tone = (ms: number, amp: number) => {
  const n = Math.round((ms / 1000) * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * 220 * i) / SR) + (Math.random() - 0.5) * 0.002;
  return x;
};
function run(v: Vad, x: Float32Array) {
  const ev = [];
  for (let i = 0; i + BLOCK <= x.length; i += BLOCK) ev.push(...v.push(x.subarray(i, i + BLOCK)));
  return ev;
}
const seq = (...parts: Float32Array[]) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Float32Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };

test("one utterance: start then end after the silence window, with pre-roll", () => {
  const v = new Vad({ sampleRate: SR });
  const ev = run(v, seq(tone(1500, 0.001), tone(2000, 0.2), tone(1500, 0.001)));
  const s = ev.find(e => e.type === "start")!, e = ev.find(e => e.type === "end")! as any;
  assert.ok(s && e, "expected start and end");
  assert.ok(Math.abs(s.t - 1.5) < 0.45, `start ≈1.5s, got ${s.t}`);
  assert.ok(e.samples.length / SR > 2.0 && e.samples.length / SR < 3.6);
  assert.equal(e.forced, false);
});

test("a short pause (<1 s) does not split the utterance", () => {
  const v = new Vad({ sampleRate: SR });
  const ev = run(v, seq(tone(1000, 0.001), tone(1200, 0.2), tone(600, 0.001), tone(1200, 0.2), tone(1500, 0.001)));
  assert.equal(ev.filter(e => e.type === "end").length, 1);
});

test("blips and quiet noise are ignored", () => {
  const v = new Vad({ sampleRate: SR });
  assert.equal(run(v, seq(tone(1000, 0.001), tone(64, 0.3), tone(2000, 0.002))).length, 0);
});

test("strict mode (interviewer speaking) ignores moderate bleed but catches a real barge-in", () => {
  const v = new Vad({ sampleRate: SR }); v.strict = true;
  assert.equal(run(v, seq(tone(1000, 0.001), tone(1000, 0.03))).filter(e => e.type === "start").length, 0);
  assert.equal(run(v, tone(600, 0.3)).filter(e => e.type === "start").length, 1);
});

test("monologues are force-cut at maxMs and keep going", () => {
  const v = new Vad({ sampleRate: SR, maxMs: 3000 });
  const ends = run(v, seq(tone(500, 0.001), tone(7000, 0.2), tone(1500, 0.001))).filter(e => e.type === "end") as any[];
  assert.ok(ends.length >= 2 && ends[0].forced && !ends.at(-1).forced);
});

test("resample + wav header", () => {
  const x = resample(new Float32Array(48000).fill(0.5), 48000, 16000);
  assert.equal(x.length, 16000);
  const b = new DataView(wav(x));
  assert.equal(b.byteLength, 44 + 32000);
  assert.equal(b.getUint32(24, true), 16000);
  assert.equal(String.fromCharCode(b.getUint8(8), b.getUint8(9), b.getUint8(10), b.getUint8(11)), "WAVE");
});
