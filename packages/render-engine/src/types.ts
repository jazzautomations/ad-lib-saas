export type RenderEngineId = "remotion" | "hyperframes" | "shotstack" | "creatomate" | "replicate" | "veo";

export interface RenderCapability {
  mediaType: string;
  maxDuration: number; // seconds, 0 for image
  aspectRatios: string[];
  features: string[];
}

export interface RenderEngine {
  id: RenderEngineId;
  name: string;
  capabilities: RenderCapability[];
  priority: number; // lower = preferred
}
