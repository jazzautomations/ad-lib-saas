import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FORMATS } from "../src/lib/formats";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  
  try {
    const { brief: raw, provider } = req.body;
    const brief = typeof raw === "string" ? JSON.parse(raw) : raw;
    
    if (!brief?.brand || !brief?.product) {
      return res.status(400).json({ error: "brand and product required" });
    }

    // Score and match formats to the brief
    const scored = FORMATS.map(f => {
      const funnelMatch = brief.objective ? f.funil.some(s => s === brief.objective) : true;
      const mediaMatch = brief.mediaType ? f.tipos.includes(brief.mediaType) : true;
      const score = (funnelMatch ? 40 : 0) + (mediaMatch ? 30 : 0);
      return { format: f, score };
    }).sort((a, b) => b.score - a.score);

    return res.json({
      recommendations: scored.slice(0, 5),
      total: FORMATS.length,
      model: provider || "big-pickle",
      agent: "ad-lib-studio"
    });
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
}