// Quick visual check: one PNG per scene (70% through it), much faster than a full render.
// node --experimental-strip-types stills.mjs sample-storyboard.json out/stills
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , input, outDir = "out/stills"] = process.argv;
const raw = JSON.parse(readFileSync(input, "utf8"));
const fps = 30;
const scenes = raw.scenes.map(s => ({ ...s, durationInFrames: s.durationInFrames ?? Math.round((Math.max(4, (s.narration.split(/\s+/).length / 140) * 60) + 0.6) * fps) }));
const props = { title: raw.title, engagement: raw.engagement, fps, scenes };
const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Explainer", inputProps: props, browserExecutable });
mkdirSync(outDir, { recursive: true });
let at = 0;
for (const [i, s] of scenes.entries()) {
  const frame = at + Math.floor(s.durationInFrames * 0.7);
  await renderStill({ composition, serveUrl, frame, inputProps: props, browserExecutable, output: path.join(outDir, `${String(i).padStart(2, "0")}-${s.kind}.png`) });
  console.log(i, s.kind, frame);
  at += s.durationInFrames;
}
