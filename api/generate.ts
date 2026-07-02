import { readFileSync } from "fs";
import { join } from "path";

const OPENCODE_ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const MODEL = "deepseek-v4-flash-free";

const SYSTEM_PROMPT = `You are AD.LIB Studio — an elite ad creative director and copywriter for paid social.

Given a brief and ad format/sub-format, generate a COMPLETE production-ready ad creative:

1. **Hook** — 3 variations for the first 3 seconds
2. **Scene-by-scene breakdown** — timing [0:00-0:03], visual direction, dialogue/text overlay
3. **CTA** — 3 options
4. **Platform adaptation** — aspect ratio, captions, native feel
5. **Music/Sound direction**
6. **Estimated duration**
7. **Shot list** — camera angles, movements

Be SPECIFIC, CREATIVE, and BOLD. Output in clean markdown.
Write as if presenting to a real client. No filler, no fluff.`;

function buildPrompt(format: any, sub: any, brief: any): string {
  return `Generate a complete ad creative:

BRAND: ${brief.brand || "Brand"}
PRODUCT: ${brief.product || format.name}
AUDIENCE: ${brief.audience || "General"}
OBJECTIVE: ${brief.objective || "Conversions"}
PLATFORM: ${brief.platform || "TikTok"}

FORMAT: ${format.name} — ${format.desc || ""}
SUB-FORMAT: ${sub.name}
HOOK STYLE: ${sub.hook || "N/A"}
STRUCTURE: ${sub.estrutura || "N/A"}
PRODUCTION TIP: ${sub.dica || "N/A"}

Generate the full creative now.`;
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { formatId, subIndex, brief } = req.body;

    if (formatId === undefined || subIndex === undefined) {
      return res.status(400).json({ error: "formatId and subIndex required" });
    }

    const filePath = join(process.cwd(), "api", "formats.json");
    const FORMATS = JSON.parse(readFileSync(filePath, "utf-8"));

    const format = FORMATS.find((f: any) => f.id === Number(formatId));
    if (!format) return res.status(404).json({ error: "Format not found" });

    const sub = format.subs?.[Number(subIndex)];
    if (!sub) return res.status(404).json({ error: "Sub-format not found" });

    const OPENCODE_ZEN_KEY = process.env.OPENCODE_ZEN_API_KEY || "sk-foDzt";
    if (!OPENCODE_ZEN_KEY) {
      return res.status(500).json({
        error: "API key not configured",
        hint: "Set OPENCODE_ZEN_API_KEY in Vercel env vars",
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
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}
