import type { RenderEngine, RenderEngineId, RenderCapability } from "./types";

export const ENGINES: Record<RenderEngineId, RenderEngine> = {
  remotion: {
    id: "remotion",
    name: "Remotion",
    capabilities: [
      { mediaType: "video", maxDuration: 120, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["react-components", "spring-animations", "audio", "text-overlay", "transitions"] },
      { mediaType: "mixed", maxDuration: 120, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["image-sequence", "pip", "green-screen"] },
    ],
    priority: 1,
  },
  hyperframes: {
    id: "hyperframes",
    name: "HyperFrames",
    capabilities: [
      { mediaType: "video", maxDuration: 60, aspectRatios: ["9:16", "16:9", "1:1"], features: ["html-css", "gsap-animations", "deterministic", "agent-native"] },
      { mediaType: "image", maxDuration: 0, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["html-css-screenshot", "templates"] },
    ],
    priority: 2,
  },
  shotstack: {
    id: "shotstack",
    name: "Shotstack",
    capabilities: [
      { mediaType: "video", maxDuration: 300, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["stock-footage", "audio", "transitions", "text-overlay"] },
      { mediaType: "mixed", maxDuration: 300, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["merge", "overlay"] },
    ],
    priority: 3,
  },
  creatomate: {
    id: "creatomate",
    name: "Creatomate",
    capabilities: [
      { mediaType: "video", maxDuration: 60, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["templates", "bulk-variations", "text-to-speech"] },
      { mediaType: "image", maxDuration: 0, aspectRatios: ["9:16", "16:9", "1:1", "4:5"], features: ["templates", "bulk"] },
    ],
    priority: 4,
  },
  replicate: {
    id: "replicate",
    name: "Replicate AI",
    capabilities: [
      { mediaType: "video", maxDuration: 30, aspectRatios: ["16:9", "9:16"], features: ["text-to-video", "image-to-video", "video-to-video"] },
      { mediaType: "image", maxDuration: 0, aspectRatios: ["1:1", "9:16", "16:9"], features: ["text-to-image", "image-to-image"] },
    ],
    priority: 5,
  },
  veo: {
    id: "veo",
    name: "Google Veo",
    capabilities: [
      { mediaType: "video", maxDuration: 60, aspectRatios: ["16:9", "9:16"], features: ["text-to-video", "image-to-video", "cinematic"] },
    ],
    priority: 6,
  },
};

export function pickEngine(format: { tipos: string[]; subs?: any[] }, options?: { preferred?: RenderEngineId }): RenderEngine {
  const mediaType = format.tipos[0] as string;
  const candidates = Object.values(ENGINES)
    .filter(e => e.capabilities.some(c => c.mediaType === mediaType))
    .sort((a, b) => a.priority - b.priority);
  
  if (options?.preferred && candidates.find(e => e.id === options.preferred)) {
    return ENGINES[options.preferred];
  }
  return candidates[0];
}
