import { readFileSync } from "fs";
import { join } from "path";

const OPENCODE_ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "deepseek-v4-flash-free";

const SYSTEM_PROMPT = `You are AD.LIB Studio — an elite ad creative director and copywriter for paid social.

Given a brief and ad format/sub-format, generate a COMPLETE production-ready ad creative:

1. **Opening Hook** (first 3 seconds) — 3+ variations
2. **Scene-by-scene breakdown** with timing, visual direction, dialogue/text overlay
3. **CTA** — 3 options
4. **Platform adaptation notes**
5. **Music/Sound direction**
6. **Estimated total duration**
7. **Shot list** (camera angles, movements)

Use timing markers like [0:00-0:03], [0:03-0:07], etc.
Output in clean markdown. Be specific, creative, and production-ready.`;

function buildPrompt(format: any, sub: any, brief: any): string {
  return `Generate a complete ad creative for:

BRAND: ${brief.brand || "Brand"}
PRODUCT: ${brief.product || "Product"}
AUDIENCE: ${brief.audience || "General"}
OBJECTIVE: ${brief.objective || "Conversions"}
PLATFORM: ${brief.platform || "TikTok"}

FORMAT: ${format.name} — ${format.desc}
SUB-FORMAT: ${sub.name}
WHEN TO USE: ${sub.quando || "N/A"}
HOOK STYLE: ${sub.hook || "N/A"}
STRUCTURE: ${sub.estrutura || "N/A"}
PRODUCTION TIP: ${sub.dica || "N/A"}

Generate a full, production-ready ad script with timing markers and visual directions.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { formatId, subIndex, brief } = req.body;

    if (formatId === undefined || subIndex === undefined) {
      return res.status(400).json({ error: "formatId and subIndex required" });
    }

    const raw = readFileSync(join(process.cwd(), "api", "formats.json"), "utf-8");
    const formats = JSON.parse(raw);
    const format = formats.find((f: any) => f.id === Number(formatId));
    if (!format) return res.status(404).json({ error: "Format not found" });

    const sub = format.subs[Number(subIndex)];
    if (!sub) return res.status(404).json({ error: "Sub-format not found" });

    const OPENCODE_ZEN_KEY = process.env.OPENCODE_ZEN_API_KEY || "sk-foDztWSZGJPANBYXNKJH84ejqqVQLNE4VwskmZqgj8Kxi2TCctR7LMkz56VO74np";
    if (!OPENCODE_ZEN_KEY) {
      return res.status(500).json({ error: "No API key configured" });
    }

    const prompt = buildPrompt(format, sub, brief || {});

    const response = await fetch(OPENCODE_ZEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENCODE_ZEN_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: `AI provider error: ${err}` });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No content generated";

    return res.json({
      script: content,
      format: format.name,
      subFormat: sub.name,
      model: MODEL,
      tokens: data.usage || {},
    });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
}
