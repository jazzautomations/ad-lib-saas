export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" } });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }

  const API_KEY = process.env.OPENCODE_ZEN_API_KEY || "sk-foDztWSZGJPANBYXNKJH84ejqqVQLNE4VwskmZqgj8Kxi2TCctR7LMkz56VO74np";
  const MODEL = "deepseek-v4-flash-free";

  const SYSTEM_PROMPT = `You are AD.LIB Studio — an elite ad creative director and copywriter for paid social. Output in clean markdown with timing markers like [0:00-0:03]. Be specific, creative, and production-ready. Start your response immediately with the answer — do not output thinking steps.`;

  try {
    const { formatName, formatDesc, subName, quando, hook, estrutura, dica, brief } = await req.json();

    if (!formatName || !subName) {
      return new Response(JSON.stringify({ error: "formatName and subName required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const b = brief || {};
    const prompt = `Generate a complete ad creative for:\n\nBRAND: ${b.brand || "Brand"}\nPRODUCT: ${b.product || formatName}\nAUDIENCE: ${b.audience || "General"}\nOBJECTIVE: ${b.objective || "Conversions"}\nPLATFORM: ${b.platform || "TikTok"}\n\nFORMAT: ${formatName} — ${formatDesc || ""}\nSUB-FORMAT: ${subName}\nWHEN TO USE: ${quando || "N/A"}\nHOOK STYLE: ${hook || "N/A"}\nSTRUCTURE: ${estrutura || "N/A"}\nPRODUCTION TIP: ${dica || "N/A"}\n\nGenerate a full, production-ready ad script with:\n1. **Opening Hook** (first 3 seconds) — 3+ variations\n2. **Scene-by-scene breakdown** with timing [0:00-0:03], visual direction, dialogue/text overlay\n3. **CTA** — 3 options\n4. **Platform adaptation notes**\n5. **Music/Sound direction**\n6. **Estimated total duration**\n7. **Shot list** (camera angles, movements)\n\nBe specific, creative, and production-ready. Output in clean markdown.`;

    const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 4096,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return new Response(JSON.stringify({ error: `AI provider error: ${err}` }), { status: 502, headers: { "Content-Type": "application/json" } });
    }

    // Stream the response
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) fullContent += delta.content;
          } catch {}
        }
      }
    }

    return new Response(JSON.stringify({
      script: fullContent || "No content generated",
      format: formatName,
      subFormat: subName,
      model: MODEL,
    }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
