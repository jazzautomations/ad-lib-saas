import { FORMATS } from "../src/lib/formats";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "GET only" });
  }

  const { id, media, funnel } = req.query;

  if (id) {
    const fmt = FORMATS.find((f) => f.id === Number(id));
    if (!fmt) return res.status(404).json({ error: "Format not found" });
    return res.json(fmt);
  }

  let results = [...FORMATS];
  if (media) results = results.filter((f) => f.tipos.includes(media as string));
  if (funnel)
    results = results.filter((f) => f.funil.includes(funnel as string));

  return res.json({
    formats: results,
    total: results.length,
    subFormats: results.reduce((a, f) => a + f.subs.length, 0),
  });
}
