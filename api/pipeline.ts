const ZEN_BASE = "https://opencode.ai/zen/v1/chat/completions";

type AgentName = "strategist" | "copywriter" | "director" | "qa";

interface AgentStep {
  name: AgentName;
  label: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

// Free models via OpenCode Zen — zero cost
const FAST = "deepseek-v4-flash-free";
const SMART = "mimo-v2.5-free";

const AGENTS: AgentStep[] = [
  {
    name: "strategist",
    label: "Strategist",
    model: FAST,
    systemPrompt: `You are a senior advertising strategist. Given a creative brief, you:
1. Analyze the product, audience, and funnel stage
2. Select the 2-3 BEST ad formats from the library provided
3. Define the core creative angle and hook for each format
4. Specify platform adaptations (Reels, Stories, Feed, TikTok, YouTube)
5. Set the emotional tone and key messaging hierarchy

Output a structured JSON object with this exact shape (no markdown, no code fences):
{
  "analysis": "One paragraph strategic analysis of the brief",
  "selectedFormats": [
    {
      "formatName": "Name from library",
      "subFormatName": "Specific sub-format",
      "angle": "Core creative angle in one sentence",
      "hook": "Opening hook — first 3 seconds / first line",
      "tone": "Emotional tone",
      "keyMessage": "Primary message to convey",
      "platformPriority": ["reels", "stories", "feed"]
    }
  ],
  "overallStrategy": "One paragraph on the creative strategy across all formats"
}`,
    maxTokens: 1024,
    temperature: 0.7,
  },
  {
    name: "copywriter",
    label: "Copywriter",
    model: SMART,
    systemPrompt: `You are a world-class direct-response copywriter. You write ad scripts that CONVERT — not poetry, not essays. Short, punchy, irresistible.

For each format the Strategist selected, write a complete ad script.

Output a JSON array (no markdown, no code fences) where each element is:
{
  "formatName": "Name from library",
  "subFormatName": "Specific sub-format",
  "script": "Full ad script with [HOOK], [BODY], [CTA] sections clearly marked",
  "hookOptions": ["Hook variant 1", "Hook variant 2", "Hook variant 3"],
  "caption": "Social media caption (if applicable)",
  "ctaText": "Exact CTA button text",
  "hashtags": ["#relevant", "#hashtags"]
}

Rules:
- Hooks must stop the scroll in under 3 seconds
- Body must build desire, not explain features
- CTA must create urgency
- Write for Humans, not robots
- Use the brand/product details from the brief
- Never use generic filler — every word must earn its place`,
    maxTokens: 2048,
    temperature: 0.8,
  },
  {
    name: "director",
    label: "Director",
    model: SMART,
    systemPrompt: `You are a creative director who translates scripts into visual production plans. You think in frames, shots, and motion.

For each ad script, create a detailed visual direction.

Output a JSON array (no markdown, no code fences) where each element is:
{
  "formatName": "Name from library",
  "subFormatName": "Specific sub-format",
  "visualStyle": "Overall visual aesthetic (color palette, mood, texture)",
  "shots": [
    {
      "time": "0-3s",
      "description": "What the viewer sees",
      "camera": "Camera movement/angle",
      "motion": "On-screen text, transitions, effects",
      "audio": "Sound/music direction"
    }
  ],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "typography": "Font style recommendation",
  "renderEngine": "remotion|creatomate|shotstack|html",
  "estimatedDuration": 15,
  "resolution": "1080x1920"
}

Think like you're briefing a production team. Be specific enough that a motion designer could execute without asking questions.`,
    maxTokens: 2048,
    temperature: 0.7,
  },
  {
    name: "qa",
    label: "QA",
    model: FAST,
    systemPrompt: `You are a QA reviewer for ad creatives. You check every asset for:
1. Brand consistency and tone match
2. Platform compliance (character limits, safe zones, duration)
3. Legal compliance (no false claims, no prohibited content)
4. CTA clarity and effectiveness
5. Hook strength (would YOU stop scrolling?)
6. Script flow and pacing
7. Visual-coherence with the script

Given the full creative package (strategy, scripts, visual direction), output a JSON object (no markdown, no code fences):
{
  "overallScore": 85,
  "verdict": "SHIP" or "REVISE",
  "strengths": ["Strong hook", "Clear CTA"],
  "issues": ["Minor: Caption too long for Instagram", "Fix: Add alt text"],
  "revisions": [
    {
      "formatName": "Name",
      "what": "What to change",
      "why": "Why it matters",
      "fixed": "Corrected version"
    }
  ],
  "finalNotes": "One paragraph summary of the package quality"
}

Be honest. If something is bad, say it. If it's good, say it.`,
    maxTokens: 1024,
    temperature: 0.3,
  },
];

interface Brief {
  brand: string;
  product: string;
  description: string;
  audience: string;
  objective: string;
  funnelStage: string;
  platforms: string[];
  tone?: string;
  budget?: string;
  references?: string;
  formats?: string[];
}

// ---------- helpers ----------

function sseSender(controller: ReadableStreamDefaultController) {
  const encoder = new TextEncoder();
  return {
    send(event: string, data: unknown) {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    },
  };
}

async function callLLM(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const res = await fetch(ZEN_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zen API ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

function extractJSON(raw: string): unknown {
  // Strip markdown fences if present
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Try parse
  try {
    return JSON.parse(s);
  } catch {
    // Attempt to find first { or [ ... last } or ]
    const firstObj = s.indexOf("{");
  const lastObj = s.lastIndexOf("}");
  if (firstObj !== -1 && lastObj > firstObj) {
    try { return JSON.parse(s.slice(firstObj, lastObj + 1)); } catch {}
  }
  const firstArr = s.indexOf("[");
  const lastArr = s.lastIndexOf("]");
  if (firstArr !== -1 && lastArr > firstArr) {
    try { return JSON.parse(s.slice(firstArr, lastArr + 1)); } catch {}
  }
  return raw;
  }
}

// ---------- handler ----------

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const apiKey = process.env.OPENCODE_ZEN_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENCODE_ZEN_API_KEY not configured" }), { status: 500 });
  }

  const brief: Brief = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const sse = sseSender(controller);
      const results: Record<string, unknown> = {};

      const userMsg = [
        `## Creative Brief`,
        `**Brand:** ${brief.brand}`,
        `**Product:** ${brief.product}`,
        `**Description:** ${brief.description}`,
        `**Target Audience:** ${brief.audience}`,
        `**Objective:** ${brief.objective}`,
        `**Funnel Stage:** ${brief.funnelStage}`,
        `**Platforms:** ${brief.platforms.join(", ")}`,
        brief.tone ? `**Tone:** ${brief.tone}` : "",
        brief.budget ? `**Budget:** ${brief.budget}` : "",
        brief.references ? `**References:** ${brief.references}` : "",
        brief.formats?.length ? `**Preferred Formats:** ${brief.formats.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      for (const agent of AGENTS) {
        sse.send("agent_start", { agent: agent.name, label: agent.label, model: agent.model });

        try {
          const contextMsg =
            agent.name === "strategist"
              ? userMsg
              : agent.name === "copywriter"
                ? `## Brief\n${userMsg}\n\n## Strategy\n${JSON.stringify(results.strategist, null, 2)}`
                : agent.name === "director"
                  ? `## Brief\n${userMsg}\n\n## Strategy\n${JSON.stringify(results.strategist, null, 2)}\n\n## Scripts\n${JSON.stringify(results.copywriter, null, 2)}`
                  : `## Brief\n${userMsg}\n\n## Strategy\n${JSON.stringify(results.strategist, null, 2)}\n\n## Scripts\n${JSON.stringify(results.copywriter, null, 2)}\n\n## Visual Direction\n${JSON.stringify(results.director, null, 2)}`;

          const raw = await callLLM(apiKey, agent.model, agent.systemPrompt, contextMsg, agent.maxTokens, agent.temperature);
          const parsed = extractJSON(raw);
          results[agent.name] = parsed;

          sse.send("agent_complete", { agent: agent.name, label: agent.label, result: parsed });
        } catch (err: any) {
          const msg = err?.message ?? String(err);
          sse.send("agent_error", { agent: agent.name, label: agent.label, error: msg });
          // Continue pipeline even if one agent fails — QA will catch issues
          results[agent.name] = { error: msg };
        }
      }

      // Final creative package
      const creativePackage = {
        strategy: results.strategist,
        scripts: results.copywriter,
        visualDirection: results.director,
        qaReview: results.qa,
        generatedAt: new Date().toISOString(),
        brief,
      };

      sse.send("complete", creativePackage);
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
