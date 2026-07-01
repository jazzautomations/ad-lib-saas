export * from "./types";
export * from "./engines";

import { ENGINES } from "./engines";
import type { RenderEngineId, RenderPlan, RenderOutput } from "./types";

export class RenderOrchestrator {
  suggestEngine(formatName: string, durationSec: number): RenderEngineId[] {
    if (durationSec <= 15) return ["hyperframes", "remotion", "shotstack"];
    if (durationSec <= 60) return ["remotion", "hyperframes"];
    return ["remotion", "shotstack"];
  }

  async render(plan: RenderPlan): Promise<RenderOutput> {
    const engine = ENGINES[plan.engine];
    if (!engine) throw new Error(`Unknown engine: ${plan.engine}`);

    // In Phase 0, return a mock/preview
    console.log(`[RenderOrchestrator] Rendering with ${engine.name}`);
    console.log(`  Format: ${plan.formatName}`);
    console.log(`  Duration: ${plan.duration}s`);
    console.log(`  Assets: ${plan.assets.length}`);

    return {
      engine: plan.engine,
      formatName: plan.formatName,
      duration: plan.duration,
      renderUrl: `https://api.ad-lib.studio/render/${crypto.randomUUID()}`,
      previewUrl: `https://api.ad-lib.studio/preview/${crypto.randomUUID()}`,
      assets: plan.assets.map(a => a.url),
      metadata: {
        engine: engine.name,
        renderedAt: new Date().toISOString(),
        version: "0.1.0",
      },
    };
  }

  previewPrompt(plan: RenderPlan): string {
    return [
      `# Render Plan for: ${plan.formatName}`,
      ``,
      `## Engine: ${plan.engine}`,
      `## Duration: ${plan.duration}s`,
      `## Aspect Ratio: ${plan.aspectRatio || "9:16"}`,
      ``,
      `### Structure`,
      plan.structure.map((s, i) => `${i + 1}. [${s.duration}s] ${s.description}`).join("\n"),
      ``,
      `### Copy`,
      plan.structure.map(s => s.copy ? `> ${s.copy}` : "").filter(Boolean).join("\n"),
      ``,
      `### Assets`,
      plan.assets.map(a => `- ${a.url} (${a.type})`).join("\n"),
    ].join("\n");
  }
}
