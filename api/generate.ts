import { FORMATS } from "../src/lib/formats";
import type { AdFormat, SubFormat } from "../src/lib/types";

const OPENCODE_ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const OPENCODE_ZEN_KEY = process.env.OPENCODE_ZEN_API_KEY || "";
const MODEL = "big-pickle";

const SYSTEM_PROMPT = `You are AD.LIB Studio, an expert ad creative director and copywriter.
Given a brief and an ad format/sub-format, you generate:
1. A complete ad script with timing
2. Visual directions for each scene
3. Hook variations (3 options)
4. CTA options
5. Platform-specific adaptations
6. Music/sound direction

Be specific, creative, and production-ready. Output in clean markdown.
Use timing markers like [0:00-0:03], [0:03-0:07], etc.`;

function buildPrompt(format: AdFormat, sub: SubFormat, brief: any): string {
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

Generate a full, production-ready ad script with:
1. **Opening Hook** (first 3 seconds) — at least 3 variations
2. **Scene-by-scene breakdown** with timing, visual direction, and dialogue/text overlay
3. **CTA** — 3 options
4. **Platform adaptation notes** (if different from default)
5. **Music/Sound direction**
6. **Estimated total duration**
7. **Shot list** (camera angles, movements)

Make it specific to the brand and product. Be creative and bold.`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { formatId, subIndex, brief } = req.body;

    if (!formatId || subIndex === undefined) {
      return res.status(400).json({ error: "formatId and subIndex required" });
    }

    const format = FORMATS.find((f) => f.id === Number(formatId));
    if (!format) return res.status(404).json({ error: "Format not found" });

    const sub = format.subs[Number(subIndex)];
    if (!sub) return res.status(404).json({ error: "Sub-format not found" });

    if (!OPENCODE_ZEN_KEY) {
      return res.status(500).json({
        error: "OPENCODE_ZEN_API_KEY not configured",
        hint: "Add the key in Vercel Settings > Environment Variables",
      });
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
      return res.status(502).json({ error: `OpenCode Zen error: ${err}` });
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content || "No content generated";

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
