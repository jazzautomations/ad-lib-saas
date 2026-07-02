import { readFileSync } from "fs";
import { join } from "path";

export default function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const filePath = join(process.cwd(), "api", "formats.json");
  const FORMATS = JSON.parse(readFileSync(filePath, "utf-8"));

  const { id, media, funnel } = req.query;

  if (id) {
    const fmt = FORMATS.find((f: any) => f.id === Number(id));
    if (!fmt) return res.status(404).json({ error: "Format not found" });
    return res.json(fmt);
  }

  let results = [...FORMATS];
  if (media) results = results.filter((f: any) => f.tipos?.includes(media));
  if (funnel) results = results.filter((f: any) => f.funil?.includes(funnel));

  return res.json({
    formats: results,
    total: results.length,
    subFormats: results.reduce((a: number, f: any) => a + (f.subs?.length || 0), 0),
  });
}
