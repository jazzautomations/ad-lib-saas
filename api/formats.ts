import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FORMATS } from "../src/lib/formats";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  if (id) {
    const fmt = FORMATS.find(f => f.id === Number(id));
    if (!fmt) return res.status(404).json({ error: "Format not found" });
    return res.json(fmt);
  }
  const { media, funnel } = req.query;
  let results = [...FORMATS];
  if (media) results = results.filter(f => f.tipos.includes(media as string));
  if (funnel) results = results.filter(f => f.funil.includes(funnel as string));
  return res.json({ formats: results, total: results.length });
}