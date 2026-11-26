// Browser side of the interview room: mic → VAD → /utterance; interviewer TTS playback with barge-in;
// mixed-audio + screen-share recording uploaded in chunks. Client-only.
import { Vad, resample, wav } from "./vad";

export type RoomState = "idle" | "listening" | "thinking" | "speaking" | "ending" | "ended" | "error";
type Turn = { say: string; action: "none" | "ask_screen_share" | "wrap_up" | "end"; phase: string } | null;

export type RoomEvents = {
  state: (s: RoomState) => void;
  caption: (who: "you" | "interviewer", text: string) => void;
  level: (rms: number) => void;
  askScreen: () => void;
  screen: (on: boolean) => void;
  error: (msg: string) => void;
};

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0][0]; if (!ch) return true;
    for (let i = 0; i < ch.length; i++) { this.buf[this.n++] = ch[i]; if (this.n === 2048) { this.port.postMessage(this.buf.slice(0)); this.n = 0; } }
    return true;
  }
}
registerProcessor("tap", Tap);`;

const sid = () => Math.random().toString(36).slice(2, 8).padEnd(6, "0");

export class RoomEngine {
  private ctx!: AudioContext;
  private mic!: MediaStream;
  private vad!: Vad;
  private mix!: MediaStreamAudioDestinationNode;
  private audioRec?: MediaRecorder;
  private screenRec?: MediaRecorder;
  private screenStream?: MediaStream;
  private screenN = 0;
  private playing?: { src: AudioBufferSourceNode; interrupted: boolean };
  private startedAt = 0;               // ms epoch of interview start (server's started_at)
  private session = sid();
  private chunks: Record<string, number> = {};
  private uploads: Promise<unknown> = Promise.resolve();
  private queue: { blob: Blob; t0: number; t1: number }[] = [];
  private busy = false;
  private lastSpeechAt = 0;
  private state: RoomState = "idle";
  private ending = false;

  constructor(private id: string, private token: string, private on: RoomEvents) {}

  private url(path = "", q: Record<string, string | number> = {}) {
    const s = new URLSearchParams({ t: this.token, ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) });
    return `/api/room/${this.id}${path}?${s}`;
  }
  private post(body: object) {
    return fetch(this.url(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
  private set(s: RoomState) { this.state = s; this.on.state(s); this.vad && (this.vad.strict = s === "speaking"); }
  private now() { return (Date.now() - this.startedAt) / 1000; }

  /** Call from a click (browsers require a gesture to start audio). */
  async start() {
    this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.ctx = new AudioContext();
    await this.ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" })));
    const src = this.ctx.createMediaStreamSource(this.mic);
    const tap = new AudioWorkletNode(this.ctx, "tap");
    src.connect(tap);
    this.vad = new Vad({ sampleRate: this.ctx.sampleRate });

    // Recording = mic + interviewer voice mixed.
    this.mix = this.ctx.createMediaStreamDestination();
    src.connect(this.mix);

    const r = await this.post({ op: "start" });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `start failed (${r.status})`);
    const { turn, started_at } = await r.json() as { turn: Turn; started_at: string };
    this.startedAt = Date.parse(started_at);
    tap.port.onmessage = e => this.onBlock(e.data as Float32Array);   // listen only once the interview clock exists

    const stream = `audio-${this.session}`;
    this.audioRec = this.recorder(this.mix.stream, stream, "audio/webm;codecs=opus");
    await this.post({ op: "stream_start", stream, offset_s: Math.max(0, this.now()) });
    this.set("listening");
    await this.deliver(turn);
  }

  private recorder(stream: MediaStream, name: string, mime: string, opts: MediaRecorderOptions = {}) {
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mime) ? mime : undefined, ...opts });
    this.chunks[name] = 0;
    rec.ondataavailable = e => { if (e.data.size) this.upload(name, e.data); };
    rec.start(5000);
    return rec;
  }

  private upload(stream: string, blob: Blob) {
    const seq = ++this.chunks[stream];
    this.uploads = this.uploads.then(async () => {
      for (let i = 0; i < 4; i++) {
        const r = await fetch(this.url("/chunk", { stream, seq }), { method: "POST", body: blob }).catch(() => null);
        if (r?.ok) return;
        await new Promise(res => setTimeout(res, 1000 * 2 ** i));
      }
      this.on.error("A piece of the recording didn't upload. The interview continues.");
    });
  }

  private onBlock(block: Float32Array) {
    let peak = 0; for (let i = 0; i < block.length; i += 8) peak += block[i] * block[i];
    this.on.level(Math.sqrt(peak / (block.length / 8)));
    for (const ev of this.vad.push(block)) {
      if (ev.type === "start") {
        this.lastSpeechAt = Date.now();
        if (this.state === "speaking") this.bargeIn();
      } else {
        const pcm = resample(ev.samples, this.ctx.sampleRate, 16000);
        this.queue.push({ blob: new Blob([wav(pcm)], { type: "audio/wav" }), t0: Math.max(0, this.now() - (ev.t1 - ev.t0)), t1: this.now() });
        void this.drain();
      }
    }
  }

  /** Send utterances in order; only the last one in a burst asks for a reply. */
  private async drain() {
    if (this.busy || this.ending) return;
    this.busy = true;
    try {
      while (this.queue.length) {
        const u = this.queue.shift()!;
        const reply = this.queue.length === 0;
        if (reply) this.set("thinking");
        const sentAt = Date.now();
        const form = new FormData();
        form.set("audio", u.blob); form.set("t_start", String(u.t0)); form.set("t_end", String(u.t1)); form.set("reply", String(reply));
        const r = await fetch(this.url("/utterance"), { method: "POST", body: form });
        if (!r.ok) { this.on.error("Couldn't process that. Please say it again."); continue; }
        const { heard, turn } = await r.json() as { heard: string; turn: Turn };
        if (heard) this.on.caption("you", heard);
        // They started talking again while we were thinking: drop this reply, the next utterance takes the turn.
        if (this.lastSpeechAt > sentAt || this.queue.length) continue;
        await this.deliver(turn);
      }
    } finally {
      this.busy = false;
      if (this.state === "thinking") this.set("listening");
    }
  }

  private async deliver(turn: Turn) {
    if (!turn) { this.set("listening"); return; }
    if (turn.action === "ask_screen_share" && !this.screenStream) this.on.askScreen();
    if (turn.say) await this.say(turn.say);
    if (turn.action === "end") await this.end("agent");
    else if (this.state !== "ending" && this.state !== "ended") this.set("listening");
  }

  private async say(text: string) {
    this.on.caption("interviewer", text);
    const t = this.now();
    const r = await this.post({ op: "tts", text });
    if (r.status !== 200) {             // no TTS configured: caption only, timed to reading speed
      this.set("speaking");
      await new Promise(res => setTimeout(res, Math.min(9000, 1200 + text.length * 45)));
      await this.post({ op: "spoken", text, t, interrupted: false });
      return;
    }
    const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);  // speakers
    src.connect(this.mix);              // recording
    const playing = (this.playing = { src, interrupted: false });
    this.set("speaking");
    await new Promise<void>(res => { src.onended = () => res(); src.start(); });
    this.playing = undefined;
    await this.post({ op: "spoken", text, t, interrupted: playing.interrupted });
  }

  private bargeIn() {
    const p = this.playing; if (!p) return;
    p.interrupted = true;
    try { p.src.stop(); } catch { /* already stopped */ }
    this.set("listening");
  }

  async shareScreen() {
    if (this.screenStream) return;
    const s = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 5, width: { max: 1920 } }, audio: false });
    this.screenStream = s;
    const name = `screen-${this.session}-${++this.screenN}`;
    this.screenRec = this.recorder(s, name, "video/webm;codecs=vp9", { videoBitsPerSecond: 1_200_000 });
    await this.post({ op: "stream_start", stream: name, offset_s: this.now() });
    this.on.screen(true);
    s.getVideoTracks()[0].onended = () => this.stopScreen();
  }

  stopScreen() {
    this.screenRec?.state === "recording" && this.screenRec.stop();
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = undefined; this.screenRec = undefined;
    this.on.screen(false);
  }

  setMuted(m: boolean) { this.mic?.getAudioTracks().forEach(t => (t.enabled = !m)); }

  async end(reason: "user" | "agent" | "timeout" = "user") {
    if (this.ending) return;
    this.ending = true;
    this.set("ending");
    this.bargeIn();
    const stopped = (rec?: MediaRecorder) => new Promise<void>(res => {
      if (!rec || rec.state === "inactive") return res();
      rec.addEventListener("stop", () => res(), { once: true }); rec.stop();
    });
    await Promise.all([stopped(this.audioRec), stopped(this.screenRec)]);
    this.screenStream?.getTracks().forEach(t => t.stop());
    await this.uploads;                 // flush the last chunks
    await this.post({ op: "end", reason, chunks: this.chunks });
    this.mic?.getTracks().forEach(t => t.stop());
    await this.ctx?.close();
    this.set("ended");
  }
}
