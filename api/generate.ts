export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const API_KEY = process.env.OPENCODE_ZEN_API_KEY || "sk-foDztWSZGJPANBYXNKJH84ejqqVQLNE4VwskmZqgj8Kxi2TCctR7LMkz56VO74np";
  const MODEL = "big-pickle";

  const SYSTEM_PROMPT = `You are AD.LIB Studio — an elite ad creative director and copywriter for paid social. Output in clean markdown with timing markers like [0:00-0:03]. Be specific, creative, and production-ready. Start your response immediately with the answer — do not output thinking steps.`;

  try {
    const { formatName, formatDesc, subName, quando, hook, estrutura, dica, brief } = await req.json();

    if (!formatName || !subName) {
      return new Response(JSON.stringify({ error: "formatName and subName required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const b = brief || {};
    const prompt = `Generate a complete ad creative for:

BRAND: ${b.brand || "Brand"}
PRODUCT: ${b.product || formatName}
AUDIENCE: ${b.audience || "General"}
OBJECTIVE: ${b.objective || "Conversions"}
PLATFORM: ${b.platform || "TikTok"}

FORMAT: ${formatName} — ${formatDesc || ""}
SUB-FORMAT: ${subName}
WHEN TO USE: ${quando || "N/A"}
HOOK STYLE: ${hook || "N/A"}
STRUCTURE: ${estrutura || "N/A"}
PRODUCTION TIP: ${dica || "N/A"}

Generate a full, production-ready ad script with:
1. **Opening Hook** (first 3 seconds) — 3+ variations
2. **Scene-by-scene breakdown** with timing [0:00-0:03], visual direction, dialogue/text overlay
3. **CTA** — 3 options
4. **Platform adaptation notes**
5. **Music/Sound direction**
6. **Estimated total duration**
7. **Shot list** (camera angles, movements)

Be specific, creative, and production-ready. Output in clean markdown.`;

    const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 16384,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `AI provider error: ${err}` }), { status: 502, headers: { "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const msg = data.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning_content || "No content generated";

    return new Response(JSON.stringify({
      script: content,
      format: formatName,
      subFormat: subName,
      model: MODEL,
      tokens: data.usage || {},
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
