// Voice activity detection + WAV encoding for the interview room. Pure logic (no DOM), unit-tested.

export type VadConfig = {
  sampleRate: number;      // input rate (AudioContext.sampleRate)
  minStartRms: number;     // absolute floor for "speech"
  startFactor: number;     // speech if rms > noiseFloor * startFactor
  startMs: number;         // must stay above threshold this long to start
  endSilenceMs: number;    // this much quiet ends the utterance
  preRollMs: number;       // audio kept from before the start trigger
  maxMs: number;           // force a cut (sent with reply=false) on very long monologues
  minMs: number;           // ignore blips shorter than this
};

export const DEFAULT_VAD: Omit<VadConfig, "sampleRate"> = {
  minStartRms: 0.012, startFactor: 3.5, startMs: 130, endSilenceMs: 1000, preRollMs: 400, maxMs: 45_000, minMs: 450,
};

export type VadEvent =
  | { type: "start"; t: number }                                   // t = seconds since detector start
  | { type: "end"; t0: number; t1: number; samples: Float32Array; forced: boolean };

export class Vad {
  private cfg: VadConfig;
  private floor = 0.005;
  private pre: Float32Array[] = [];
  private preLen = 0;
  private buf: Float32Array[] = [];
  private bufLen = 0;
  private speaking = false;
  private aboveMs = 0;
  private quietMs = 0;
  private startAt = 0;
  private clock = 0;          // samples consumed
  /** Raise the bar while the interviewer is talking (speaker bleed / echo). */
  strict = false;

  constructor(cfg: Partial<VadConfig> & { sampleRate: number }) { this.cfg = { ...DEFAULT_VAD, ...cfg }; }

  get threshold() {
    const base = Math.max(this.cfg.minStartRms, this.floor * this.cfg.startFactor);
    return this.strict ? Math.max(0.04, base * 2.5) : base;
  }

  /** Feed one block of mono samples; returns events produced by this block. */
  push(block: Float32Array): VadEvent[] {
    const sr = this.cfg.sampleRate, ms = (block.length / sr) * 1000;
    const rms = Math.sqrt(block.reduce((a, x) => a + x * x, 0) / block.length);
    const t = this.clock / sr;
    this.clock += block.length;
    const out: VadEvent[] = [];

    if (!this.speaking) {
      // track the noise floor only when not speaking (slow up, fast down)
      this.floor = rms < this.floor ? this.floor * 0.9 + rms * 0.1 : this.floor * 0.995 + rms * 0.005;
      this.pre.push(block); this.preLen += block.length;
      while (this.preLen - this.pre[0].length >= (this.cfg.preRollMs / 1000) * sr) this.preLen -= this.pre.shift()!.length;
      this.aboveMs = rms > this.threshold ? this.aboveMs + ms : 0;
      if (this.aboveMs >= (this.strict ? Math.max(this.cfg.startMs, 300) : this.cfg.startMs)) {
        this.speaking = true; this.quietMs = 0;
        this.buf = this.pre; this.bufLen = this.preLen; this.pre = []; this.preLen = 0;
        this.startAt = t - (this.bufLen - block.length) / sr;
        out.push({ type: "start", t: Math.max(0, this.startAt) });
      }
      return out;
    }

    this.buf.push(block); this.bufLen += block.length;
    this.quietMs = rms < this.threshold * 0.7 ? this.quietMs + ms : 0;
    const dur = (this.bufLen / sr) * 1000;
    const ended = this.quietMs >= this.cfg.endSilenceMs, forced = dur >= this.cfg.maxMs;
    if (ended || forced) {
      const samples = concat(this.buf, this.bufLen);
      const t1 = t + block.length / sr;
      this.buf = []; this.bufLen = 0; this.speaking = forced; this.aboveMs = 0; this.quietMs = 0;
      if (dur - (ended ? this.cfg.endSilenceMs : 0) >= this.cfg.minMs)
        out.push({ type: "end", t0: Math.max(0, this.startAt), t1, samples, forced });
      if (forced) this.startAt = t1;
    }
    return out;
  }
}

function concat(parts: Float32Array[], n: number) {
  const out = new Float32Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Linear-interpolation resample, fine for speech going to STT. */
export function resample(x: Float32Array, from: number, to = 16000): Float32Array {
  if (from === to) return x;
  const n = Math.floor((x.length * to) / from), out = new Float32Array(n), r = from / to;
  for (let i = 0; i < n; i++) {
    const p = i * r, j = Math.floor(p), f = p - j;
    out[i] = (x[j] ?? 0) * (1 - f) + (x[j + 1] ?? x[j] ?? 0) * f;
  }
  return out;
}

/** 16-bit PCM mono WAV. */
export function wav(x: Float32Array, sampleRate = 16000): ArrayBuffer {
  const b = new ArrayBuffer(44 + x.length * 2), v = new DataView(b);
  const s = (o: number, str: string) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, "RIFF"); v.setUint32(4, 36 + x.length * 2, true); s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, "data"); v.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 0x7fff, true);
  return b;
}
