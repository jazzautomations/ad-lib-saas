const API_BASE = "https://api.openai.com/v1";
export default async function handler(req: Request): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers });
  }
  const API_KEY = process.env.OPENCODE_ZEN_API_KEY || process.env.OPENAI_API_KEY;
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: "API key not configured. Set OPENCODE_ZEN_API_KEY or OPENAI_API_KEY in Vercel project env." }),
      { status: 500, headers }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers });
  }
  const { formatName, formatDesc, subName, quando, hook, estrutura, dica, brief } = body;
  if (!formatName || !subName) {
    return new Response(
      JSON.stringify({ error: "formatName and subName required" }),
      { status: 400, headers }
    );
  }
  const b = (brief || {}) as Record<string, string>;
  const messages = [
    {
      role: "system" as const,
      content: `You are AD.LIB Studio — an elite ad creative director and copywriter for paid social. Output in clean markdown with timing markers like [0:00-0:03]. Be specific, creative, and production-ready. Start your response immediately with the answer — do not output thinking steps.`,
    },
    {
      role: "user" as const,
      content: `Generate a complete ad creative for:
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
Be specific, creative, and production-ready. Output in clean markdown.`,
    },
  ];
  const model = process.env.ADLIB_MODEL || "gpt-4o-mini";
  try {
    const aiRes = await fetch(`${API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2048,
        temperature: 0.8,
        // no streaming — Vercel Hobby has 10s timeout, streaming LLM usually exceeds it
      }),
      signal: AbortSignal.timeout(25000), // 25s internal timeout
    });
    if (!aiRes.ok) {
      const errBody = await aiRes.text().catch(() => "unknown error");
      // Try to extract a useful message
      let errMsg = `AI provider error (${aiRes.status})`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed.error?.message || parsed.error || errMsg;
      } catch {
        errMsg = errBody.slice(0, 200) || errMsg;
      }
      // Check for known credit/insufficient-quota patterns
      if (aiRes.status === 402 || errMsg.includes("CreditsError") || errMsg.includes("insufficient_quota") || errMsg.includes("payment")) {
        errMsg = "API key has no credits. Add a payment method to your API provider, or set a different OPENCODE_ZEN_API_KEY / OPENAI_API_KEY.";
      }
      return new Response(JSON.stringify({ error: errMsg }), { status: 502, headers });
    }
    const data = await aiRes.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI returned empty response. Try again or use a different model." }),
        { status: 502, headers }
      );
    }
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...headers, "Cache-Control": "no-store" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("timed out") || msg.includes("AbortError") || msg.includes("Timeout")) {
      return new Response(
        JSON.stringify({ error: "Request timed out. Try a faster model or a shorter brief." }),
        { status: 504, headers }
      );
    }
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
}
