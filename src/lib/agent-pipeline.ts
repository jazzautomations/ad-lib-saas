import type { CreativeBrief, GeneratedAd } from "./types";
import { suggestFormatsForBrief, generateScript, getFormatByName } from "./engine";

const API_BASE = "https://opencode.ai/zen/v1";
const MODEL = "big-pickle";

interface OpenCodeResponse {
  content?: string;
  reasoning?: string;
  cost: string;
  tool_calls?: { function: { name: string; arguments: string }; id: string }[];
}

async function callOpenCode(messages: { role: string; content: string }[]): Promise<OpenCodeResponse> {
  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, max_completion_tokens: 8192, max_tokens: 4096 })
  });
  return res.json();
}

export async function generateAds(brief: CreativeBrief): Promise<GeneratedAd[]> {
  // 1. Suggest formats based on brief
  const suggestions = suggestFormatsForBrief(brief);
  
  // 2. Use OpenCode Zen to refine and generate
  const prompt = `You are an expert creative director. Given this brief:
Brand: ${brief.brand}
Product: ${brief.product}
Offer: ${brief.offer}
Target: ${brief.targetAudience}
${brief.platform ? `Platform: ${brief.platform}` : ""}
${brief.funnelStage ? `Funnel Stage: ${brief.funnelStage}` : ""}

Generate a complete ad script using the top format suggestion: ${suggestions[0]?.format.name} — ${suggestions[0]?.sub.name}

Output format:
## Ad Script
[Full script with hook, body, CTA]

## Production Notes
[Technical notes]

## Variations
[2 alternative approaches]`;

  const response = await callOpenCode([
    { role: "system", content: "You are AD.LIB's creative director. Generate professional ad scripts." },
    { role: "user", content: prompt }
  ]);

  return [{
    id: crypto.randomUUID(),
    formatName: suggestions[0]?.format.name || "Custom",
    subFormatName: suggestions[0]?.sub.name || "Custom",
    script: response.content || "Generation failed",
    storyboard: [],
    platform: brief.platform || "general",
    estimatedDuration: 30
  }];
}
