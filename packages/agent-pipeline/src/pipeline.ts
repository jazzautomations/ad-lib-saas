import type { BrandBrief, CreativeStrategy, ScriptOutput, PipelineResult } from "./types";

export type AgentRole = "strategist" | "copywriter" | "editor" | "qa";

export interface AgentTask {
  role: AgentRole;
  input: any;
  output: any;
}

export class AgentPipeline {
  async run(brief: BrandBrief): Promise<PipelineResult> {
    console.log(`[AgentPipeline] Starting pipeline for ${brief.brand}`);

    // Step 1: Strategist — picks formats
    const strategy = await this.strategist(brief);

    // Step 2: Copywriter — writes per-format copy
    const scripts = await this.copywriter(brief, strategy);

    // Step 3: Editor — creates render plans
    const renderPlans = await this.editor(brief, scripts);

    // Step 4: QA — validates everything
    const outputs = await this.qa(brief, scripts, renderPlans);

    return { brief, strategy, scripts, renderPlans, outputs };
  }

  private async strategist(brief: BrandBrief): Promise<CreativeStrategy> {
    // Phase 0: smart strategy based on brief heuristics
    const formatSelection = this.suggestFormats(brief);
    return { chosenFormats: formatSelection };
  }

  private suggestFormats(brief: BrandBrief) {
    // Heuristic format selection based on funnel & offer type
    const formats = [];
    
    // Top-funnel: awareness formats
    formats.push({
      formatId: 7, formatName: "QUESTION BOX", subFormat: "Rapid-Fire Question Series",
      platform: "tiktok", aspectRatio: "9:16",
      rationale: "Nativo do TikTok/Reels — alto engajamento orgânico. Ideal para cold audience."
    });
    
    // Mid-funnel: consideration
    formats.push({
      formatId: 1, formatName: "TALKING HEAD", subFormat: "Hot Take / Controversy",
      platform: "instagram", aspectRatio: "9:16",
      rationale: "Posicionamento de marca. Gera shares e comentários."
    });
    
    // Bottom-funnel: conversion
    formats.push({
      formatId: 18, formatName: "URGENCY / DIRECT OFFER", subFormat: "Bonus Stack",
      platform: "facebook", aspectRatio: "1:1",
      rationale: "Retargeting direto. Oferta + bônus = conversão."
    });
    
    return formats;
  }

  private async copywriter(brief: BrandBrief, strategy: CreativeStrategy): Promise<ScriptOutput[]> {
    return strategy.chosenFormats.map(f => ({
      formatName: f.formatName,
      subFormatName: f.subFormat,
      hook: brief.usp.includes("grátis") || brief.usp.includes("free")
        ? `"Stop paying for [problem]. This is completely free."`
        : `"The one thing nobody tells you about [result]."`,
      body: `${brief.product} helps ${brief.targetAudience} achieve ${brief.offer}. Unlike competitors, ${brief.usp}.`,
      cta: "Link in bio / Comment LINK for details",
      duration: f.aspectRatio === "9:16" ? 15 : 30,
      structure: ["Hook (0-3s)", "Problem aggravation (3-7s)", "Solution reveal (7-12s)", "Proof (12-20s)", "CTA (20-30s)"],
    }));
  }

  private async editor(brief: BrandBrief, scripts: ScriptOutput[]): Promise<any[]> {
    return scripts.map(s => ({
      engine: "hyperframes",
      formatName: s.formatName,
      duration: s.duration,
      aspectRatio: "9:16",
      assets: brief.sourceAssetUrl ? [{ url: brief.sourceAssetUrl, type: "video" }] : [],
      structure: s.structure.map((desc, i) => ({ duration: Math.round(s.duration / s.structure.length), description: desc })),
    }));
  }

  private async qa(brief: BrandBrief, scripts: ScriptOutput[], plans: any[]): Promise<any[]> {
    // Phase 0: basic validation
    return scripts.map((s, i) => ({
      formatName: s.formatName,
      passed: s.hook.length > 0 && s.cta.length > 0 && plans[i]?.structure.length > 0,
      warnings: s.hook.length < 10 ? ["Hook might be too short to grab attention"] : [],
    }));
  }
}
