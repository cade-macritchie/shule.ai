import { Composition } from "remotion";
import type { RenderProps } from "@ps/shared/src/storyboard.ts";
import { Explainer } from "./Explainer";
import sample from "../sample-storyboard.json";

const FPS = 30;
const WPM = 140;

// Studio preview: estimate scene lengths from narration when no TTS audio is attached.
const defaultProps: RenderProps = {
  title: sample.title, engagement: sample.engagement, fps: FPS,
  scenes: (sample.scenes as any[]).map(s => ({
    ...s, durationInFrames: Math.round((Math.max(4, (s.narration.split(/\s+/).length / WPM) * 60) + 0.6) * FPS),
  })),
};

export const Root = () => (
  <Composition
    id="Explainer"
    component={Explainer as any}
    width={1920}
    height={1080}
    fps={FPS}
    durationInFrames={300}
    defaultProps={defaultProps as any}
    calculateMetadata={({ props }) => {
      const p = props as unknown as RenderProps;
      return { durationInFrames: p.scenes.reduce((a, s) => a + s.durationInFrames, 0), fps: p.fps };
    }}
  />
);
