// Usage: node render.mjs <props.json | storyboard.json> <out.mp4> [--audio-dir dir]
// props.json = RenderProps (scenes with durationInFrames + audio filename) written by the worker.
// A bare storyboard.json (no durations) renders silently with estimated lengths, for previews.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, mkdtempSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , input, out, ...rest] = process.argv;
if (!input || !out) { console.error("usage: node render.mjs props.json out.mp4 [--audio-dir dir]"); process.exit(2); }
const audioDir = rest[rest.indexOf("--audio-dir") + 1] && rest.includes("--audio-dir") ? rest[rest.indexOf("--audio-dir") + 1] : null;

const raw = JSON.parse(readFileSync(input, "utf8"));
const fps = raw.fps ?? 30;
const props = {
  title: raw.title, engagement: raw.engagement, fps,
  scenes: raw.scenes.map(s => ({
    ...s,
    durationInFrames: s.durationInFrames ?? Math.round((Math.max(4, (s.narration.split(/\s+/).length / 140) * 60) + 0.6) * fps),
  })),
};

// Scene audio is served from a throwaway public dir so staticFile() can find it.
const publicDir = mkdtempSync(path.join(tmpdir(), "ps-public-"));
if (audioDir) cpSync(audioDir, publicDir, { recursive: true });
for (const s of props.scenes) if (s.audio && !existsSync(path.join(publicDir, s.audio))) delete s.audio;

const browserExecutable = process.env.BROWSER_EXECUTABLE || null; // e.g. /usr/bin/google-chrome on offline boxes
const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir });
const composition = await selectComposition({ serveUrl, id: "Explainer", inputProps: props, browserExecutable });
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
let last = -1;
await renderMedia({
  composition, serveUrl, codec: "h264", crf: 20, pixelFormat: "yuv420p", audioCodec: "aac",
  outputLocation: out, inputProps: props, concurrency: null, browserExecutable,
  onProgress: ({ progress }) => { const pct = Math.floor(progress * 10) * 10; if (pct !== last) { last = pct; console.log(`render ${pct}%`); } },
});
console.log(out);
