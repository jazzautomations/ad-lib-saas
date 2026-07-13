export const config = { runtime: "edge" };

function generateCreativeHTML(data: Record<string, unknown>): string {
  const brief = (data.brief || {}) as Record<string, string>;
  const strategy = (data.strategy || {}) as Record<string, unknown>;
  const script = (data.script || {}) as Record<string, unknown>;
  const visual = (data.visualDirection || {}) as Record<string, unknown>;

  const strategyObj = (strategy.strategy || strategy) as Record<string, unknown>;
  const visualObj = (visual.visualDirection || visual) as Record<string, unknown>;
  const scriptObj = script;

  const hooks = (scriptObj.hooks || []) as string[];
  const scenes = (scriptObj.scenes || []) as Array<Record<string, string>>;
  const ctas = (scriptObj.ctas || []) as string[];
  const palette = (visualObj.colorPalette || ["#FF3366", "#0A0A0A", "#FFFFFF", "#1A1A2E"]) as string[];

  const scenesHTML = scenes.map((s, i) => `
    <div class="scene" style="border-left: 3px solid ${palette[i % palette.length]};">
      <div class="scene-timing">${s.timing || `[0:0${i * 3}-0:0${(i + 1) * 3}]`}</div>
      <div class="scene-visual">${s.visual || `Scene ${i + 1}`}</div>
      ${s.textOverlay ? `<div class="scene-overlay">${s.textOverlay}</div>` : ""}
      <div class="scene-audio">🔊 ${s.audio || ""}</div>
    </div>
  `).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Creative — ${brief.brand || "Brand"} × ${brief.product || "Product"}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #0a0a0a; color: #f0f0f0; padding: 40px; max-width: 480px; margin: 0 auto; }

  .hero {
    background: linear-gradient(135deg, ${palette[0]}22, ${palette[2] || "#1A1A2E"}11);
    border: 1px solid ${palette[0]}33;
    border-radius: 20px;
    padding: 32px 24px;
    margin-bottom: 24px;
    text-align: center;
  }
  .hero .brand { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: ${palette[0]}; margin-bottom: 8px; font-weight: 600; }
  .hero .product { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
  .hero .angle { font-size: 13px; color: #aaa; line-height: 1.5; }

  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: ${palette[0]}; margin-bottom: 10px; font-weight: 600; }

  .hook-card {
    background: #141414;
    border: 1px solid #222;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 8px;
    font-size: 13px;
    line-height: 1.5;
    position: relative;
    padding-left: 36px;
  }
  .hook-card::before {
    content: attr(data-num);
    position: absolute;
    left: 12px;
    top: 14px;
    font-size: 11px;
    font-weight: 800;
    color: ${palette[0]};
  }

  .scene {
    background: #111;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 8px;
    font-size: 12px;
    line-height: 1.6;
  }
  .scene-timing { font-family: 'Space Grotesk', monospace; font-size: 11px; color: ${palette[0]}; margin-bottom: 4px; font-weight: 600; }
  .scene-visual { color: #ddd; margin-bottom: 4px; }
  .scene-overlay { color: #fff; font-weight: 700; background: ${palette[0]}22; padding: 4px 8px; border-radius: 6px; display: inline-block; margin: 4px 0; }
  .scene-audio { color: #777; font-size: 11px; }

  .cta-card {
    background: ${palette[0]}15;
    border: 1px solid ${palette[0]}33;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${palette[0]};
  }

  .meta-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .meta-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 4px 10px;
    border-radius: 6px;
    background: #181818;
    border: 1px solid #282828;
    color: #999;
  }

  .palette-row { display: flex; gap: 6px; margin-bottom: 20px; }
  .palette-swatch { width: 28px; height: 28px; border-radius: 8px; border: 2px solid #222; }
</style>
</head>
<body>

  <div class="hero">
    <div class="brand">${brief.brand || "Brand"}</div>
    <div class="product">${brief.product || "Product"}</div>
    <div class="angle">${String(strategyObj.creativeAngle || strategyObj.coreMessage || "Creative direction")}</div>
  </div>

  <div class="meta-row">
    <span class="meta-tag">${brief.platform || "TikTok"}</span>
    <span class="meta-tag">${brief.objective || "Conversions"}</span>
    <span class="meta-tag">${(scriptObj.totalDuration || "15-30s") as string}</span>
    <span class="meta-tag">${String(strategyObj.emotionalLever || "aspiration")}</span>
  </div>

  <div class="palette-row">
    ${palette.map(c => `<div class="palette-swatch" style="background:${c}"></div>`).join("\n    ")}
  </div>

  ${hooks.length ? `
  <div class="section">
    <div class="section-title">🎣 Hooks</div>
    ${hooks.map((h, i) => `<div class="hook-card" data-num="${i + 1}">${h}</div>`).join("\n    ")}
  </div>` : ""}

  ${scenes.length ? `
  <div class="section">
    <div class="section-title">🎬 Script</div>
    ${scenesHTML}
  </div>` : ""}

  ${ctas.length ? `
  <div class="section">
    <div class="section-title">📣 CTAs</div>
    ${ctas.map((c, i) => `<div class="cta-card" data-num="${i + 1}">${c}</div>`).join("\n    ")}
  </div>` : ""}

  <div style="margin-top:32px;text-align:center;font-size:10px;color:#333;letter-spacing:1px;">
    GENERATED BY AD.LIB STUDIO
  </div>

</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  }

  try {
    const body = await req.json();
    const html = generateCreativeHTML(body as Record<string, unknown>);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Render failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
